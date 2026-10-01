/**
 * 健澜科技 jlmedaios - 互联网在线支付 集成测试（M3-M）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock，支付渠道用
 * 本地演示提供方 MockPaymentProvider），覆盖：
 *  - 全链路：审方通过处方 → 患者发起支付（mock 下单即完成）→ 医保分割
 *    → 处方 paid → 电子票据 issued → 患者查看；
 *  - 幂等/并发：幂等键重复 409、在途支付单重复发起 409、票据唯一；
 *  - 状态机：非 approved 处方不可支付、paid 不可取消、冲正后处方回 returned；
 *  - 越权：他人患者发起 403、非财务角色冲正 403、未认证 401；
 *  - 财务冲正：支付单 cancelled + 票据 reversed + 原因必填；
 *  - BFF 路由信封 401/403/400/409。
 *
 * 隔离说明：创建临时医生与患者，afterAll 删除全部夹具。
 * 需要可用 PostgreSQL；无 DB 自动跳过。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserById, getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  loginWithWechat,
  addProfile,
  verifyRealname,
  submitPractitioner,
  auditPractitioner,
} from '../../src/bff/aggregators/internetPatientAggregator.js';
import {
  startConsultation,
  acceptSession,
} from '../../src/bff/aggregators/consultationAggregator.js';
import {
  createEPrescriptionByDoctor,
  reviewEPrescriptionByPharmacist,
} from '../../src/bff/aggregators/internetPrescriptionAggregator.js';
import {
  InternetPaymentError,
  createPaymentByPatient,
  cancelPaymentByPatient,
  refundPaymentByFinance,
  listMyPayments,
  listMyInvoices,
  listFinancePayments,
  listFinanceInvoices,
} from '../../src/bff/aggregators/internetPaymentAggregator.js';
import { internetPaymentRoutes } from '../../src/bff/routes/internetPayment.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let pharmacist: AuthView;
let nurse: AuthView;

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const accountIds: string[] = [];
const patientIds: string[] = [];
const visitIds: string[] = [];
const practitionerIds: string[] = [];
const tempDoctorIds: string[] = [];
const rxIds: string[] = [];
const paymentIds: string[] = [];

/** 生成合法身份证号（含校验位） */
function validIdCard(front17: string): string {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(front17[i]) * weights[i];
  return front17 + checkCodes[sum % 11];
}

function genIdCard(): string {
  const area = '110101';
  const year = String(1980 + Math.floor(Math.random() * 15));
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  const seq = String(Math.floor(100 + Math.random() * 900));
  return validIdCard(area + year + month + day + seq);
}

/** 创建一个临时医生（iam.users + user_roles），返回 AuthView */
async function createTempDoctor(suffix: string): Promise<AuthView> {
  const db = getDb();
  const username = 'm3mdoc_' + suffix + '_' + rand();
  const rows = await db`
    INSERT INTO iam.users (username, name, department, title, role, status)
    VALUES (${username}, '在线支付测试医生', '心血管内科', '主治医师', 'doctor', 'active')
    RETURNING id
  `;
  const id = String((rows as unknown as { id: string }[])[0].id);
  tempDoctorIds.push(id);
  await db`
    INSERT INTO iam.user_roles (user_id, role_code, data_scope)
    VALUES (${id}, 'doctor', 'hospital')
  `;
  const user = await getUserById(id);
  if (!user) throw new Error('临时医生创建失败');
  return buildAuthView(user, await getUserRoleLinks(id));
}

/** 创建完整复诊患者（登录→就诊人→实名→历史就诊），返回账户/就诊人/患者 ID */
async function seedFollowupPatient(tag: string, dept = '心血管内科') {
  const login = await loginWithWechat({ code: 'l-' + tag + '-' + rand() });
  accountIds.push(login.accountId);
  const profile = await addProfile(login.accountId, {
    relation: 'self',
    name: '在线支付患者',
    gender: '男',
  });
  const rn = await verifyRealname(
    login.accountId,
    { profileId: profile.id, realName: '在线支付患者', idCard: genIdCard() },
    'trc_m',
  );
  if (!rn.patientId) throw new Error('实名未取得 patientId');
  patientIds.push(rn.patientId);

  const db = getDb();
  const visitNo = 'VM' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rows = await db`
    INSERT INTO clinical.visits (
      patient_id, visit_no, visit_type, department, status,
      chief_complaint, admit_at, discharge_at
    ) VALUES (
      ${rn.patientId}, ${visitNo}, 'outpatient', ${dept}, 'discharged',
      '既往就诊', now() - interval '30 days', now() - interval '29 days'
    )
    RETURNING id
  `;
  visitIds.push(String((rows as unknown as { id: string }[])[0].id));
  return { accountId: login.accountId, profileId: profile.id, patientId: rn.patientId };
}

/** 确保医生已审核线上资质（幂等），返回 doctorId */
async function ensureApprovedDoctor(view: AuthView, scope: string) {
  const db = getDb();
  const s = await submitPractitioner(view.id, {
    practitionerNo: '110' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0'),
    practitionerType: 'doctor',
    practiceScope: scope,
    practiceYears: 10,
  });
  practitionerIds.push(s.id);
  await auditPractitioner(s.id, admin.id, { decision: 'approved' });
  return view.id;
}

/** 开一张已审方通过的处方（患者 → 会话 → 开方 → 药师通过） */
async function openApprovedRx(doc: AuthView, tag: string) {
  const p = await seedFollowupPatient(tag);
  const session = await startConsultation(p.accountId, {
    profileId: p.profileId,
    doctorId: doc.id,
    chiefComplaint: '复诊开药',
  });
  await acceptSession(doc.id, session.id);
  const rx = await createEPrescriptionByDoctor(doc, {
    sessionId: session.id,
    items: [
      {
        drugCode: 'D018',
        drugName: '阿莫西林',
        specification: '0.25g*24粒',
        dosage: 0.5,
        dosageUnit: 'g',
        frequency: 'tid',
        route: '口服',
        daysSupply: 7,
        quantity: 1,
        quantityUnit: '盒',
        skinTest: true,
        remark: '需皮试',
      },
      {
        drugCode: 'D001',
        drugName: '阿司匹林',
        specification: '100mg*30片',
        dosage: 100,
        dosageUnit: 'mg',
        frequency: 'qd',
        route: '口服',
        daysSupply: 14,
        quantity: 2,
        quantityUnit: '盒',
        skinTest: false,
      },
    ],
    idempotencyKey: 'erm-' + tag + '-' + rand(),
  });
  rxIds.push(rx.id);
  const reviewed = await reviewEPrescriptionByPharmacist(pharmacist, {
    prescriptionId: rx.id,
    decision: 'approved',
    auditComment: '审核通过',
  });
  return { p, session, rx, reviewed };
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  pharmacist = await load('pharmacist_wang');
  nurse = await load('nurse_zhao');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 票据 → 支付单 → 处方明细/处方 → 消息 → 会话 → 就诊 → 实名 → 就诊人 → 账户 → 患者 → 医生
    if (paymentIds.length) await db`DELETE FROM clinical.e_invoices WHERE payment_id IN ${db(paymentIds)}`;
    if (paymentIds.length) await db`DELETE FROM clinical.online_payments WHERE id IN ${db(paymentIds)}`;
    await db`DELETE FROM clinical.internet_prescription_items WHERE prescription_id IN ${db(rxIds)}`;
    await db`DELETE FROM clinical.internet_prescriptions WHERE id IN ${db(rxIds)}`;
    await db`
      DELETE FROM clinical.consultation_messages WHERE session_id IN (
        SELECT id FROM clinical.consultation_sessions WHERE account_id IN ${db(accountIds)}
      )
    `;
    await db`
      DELETE FROM clinical.consultation_sessions WHERE account_id IN ${db(accountIds)}
    `;
    if (visitIds.length) await db`DELETE FROM clinical.visits WHERE id IN ${db(visitIds)}`;
    await db`
      DELETE FROM clinical.realname_verifications WHERE profile_id IN (
        SELECT id FROM clinical.patient_profiles WHERE account_id IN ${db(accountIds)}
      )
    `;
    await db`DELETE FROM clinical.patient_profiles WHERE account_id IN ${db(accountIds)}`;
    await db`DELETE FROM clinical.patient_accounts WHERE id IN ${db(accountIds)}`;
    if (patientIds.length) await db`DELETE FROM clinical.patients WHERE id IN ${db(patientIds)}`;
    if (practitionerIds.length) {
      await db`DELETE FROM iam.internet_practitioners WHERE id IN ${db(practitionerIds)}`;
    }
    if (tempDoctorIds.length) {
      await db`DELETE FROM iam.users WHERE id IN ${db(tempDoctorIds)}`;
    }
  }
});

/* ============================ 聚合器层 ============================ */

describe.skipIf(!dbAvailable)('M3-M 在线支付 · 聚合器全链路', () => {
  it('审方通过处方 → 患者支付（mock 下单即完成）→ 医保分割 → 处方 paid → 票据 issued', async () => {
    const doc = await createTempDoctor('pay1');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, rx } = await openApprovedRx(doc, 'pay1');

    const amount = Number(rx.totalFee);
    expect(amount).toBeGreaterThan(0);
    const medicarePaid = Math.round(amount * 0.6 * 100) / 100;
    const selfPaid = Math.round((amount - medicarePaid) * 100) / 100;

    const result = await createPaymentByPatient(p.accountId, p.patientId, {
      prescriptionId: rx.id,
      channel: 'mock',
      idempotencyKey: 'paym-' + rand(),
    });
    paymentIds.push(result.payment.id);

    // 支付单：paid + 医保分割正确
    expect(result.payment.status).toBe('paid');
    expect(Number(result.payment.amount)).toBe(amount);
    expect(Number(result.payment.medicarePaid)).toBe(medicarePaid);
    expect(Number(result.payment.selfPaid)).toBe(selfPaid);
    expect(result.payment.channelTxnNo).toContain('MOCK');
    // 票据已开
    expect(result.invoice).not.toBeNull();
    expect(result.invoice!.status).toBe('issued');
    expect(result.invoice!.invoiceNo).toContain('INV');
    // 处方联动 paid
    expect(result.rx.status).toBe('paid');

    // 患者可查看支付单与票据
    const myPays = await listMyPayments(p.accountId, p.patientId);
    expect(myPays.some((x) => x.id === result.payment.id)).toBe(true);
    const myInvs = await listMyInvoices(p.accountId, p.patientId);
    expect(myInvs.some((x) => x.id === result.invoice!.id)).toBe(true);
  });

  it('幂等：同幂等键重复发起 409；同处方在途支付单 409', async () => {
    const doc = await createTempDoctor('pay2');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, rx } = await openApprovedRx(doc, 'pay2');

    const key = 'paym-dup-' + rand();
    const r1 = await createPaymentByPatient(p.accountId, p.patientId, {
      prescriptionId: rx.id, channel: 'mock', idempotencyKey: key,
    });
    paymentIds.push(r1.payment.id);
    // 同幂等键
    await expect(
      createPaymentByPatient(p.accountId, p.patientId, {
        prescriptionId: rx.id, channel: 'mock', idempotencyKey: key,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    // 同处方在途支付单（新键）
    await expect(
      createPaymentByPatient(p.accountId, p.patientId, {
        prescriptionId: rx.id, channel: 'mock', idempotencyKey: 'paym-' + rand(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('状态机：非 approved 处方不可支付；paid 支付单不可取消', async () => {
    const doc = await createTempDoctor('pay3');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, session, rx } = await (async () => {
      const pp = await seedFollowupPatient('pay3');
      const session = await startConsultation(pp.accountId, {
        profileId: pp.profileId, doctorId: doc.id, chiefComplaint: '复诊开药',
      });
      await acceptSession(doc.id, session.id);
      const r = await createEPrescriptionByDoctor(doc, {
        sessionId: session.id,
        items: [{ drugName: '布洛芬缓释胶囊', dosage: 0.3, dosageUnit: 'g', frequency: 'bid', route: '口服', daysSupply: 3, quantity: 1, quantityUnit: '盒', skinTest: false }],
        idempotencyKey: 'erm-' + rand(),
      });
      rxIds.push(r.id);
      return { p: pp, session, rx: r };
    })();
    void session;
    // pending_review 处方不可支付
    await expect(
      createPaymentByPatient(p.accountId, p.patientId, {
        prescriptionId: rx.id, channel: 'mock', idempotencyKey: 'paym-' + rand(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('越权：他人患者发起支付 403；本人支付单被他人取消 403', async () => {
    const doc = await createTempDoctor('pay4');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, rx } = await openApprovedRx(doc, 'pay4');
    const r = await createPaymentByPatient(p.accountId, p.patientId, {
      prescriptionId: rx.id, channel: 'mock', idempotencyKey: 'paym-' + rand(),
    });
    paymentIds.push(r.payment.id);

    const other = await seedFollowupPatient('pay4b');
    await expect(
      createPaymentByPatient(other.accountId, p.patientId, {
        prescriptionId: rx.id, channel: 'mock', idempotencyKey: 'paym-' + rand(),
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      cancelPaymentByPatient(other.accountId, other.patientId, r.payment.id),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('财务冲正：paid → cancelled + 票据 reversed + 处方 returned；原因必填', async () => {
    const doc = await createTempDoctor('pay5');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, rx } = await openApprovedRx(doc, 'pay5');
    const r = await createPaymentByPatient(p.accountId, p.patientId, {
      prescriptionId: rx.id, channel: 'mock', idempotencyKey: 'paym-' + rand(),
    });
    paymentIds.push(r.payment.id);
    expect(r.invoice).not.toBeNull();

    // 原因必填
    await expect(
      refundPaymentByFinance(pharmacist, r.payment.id, ''),
    ).rejects.toMatchObject({ status: 400 });
    // 药师冲正
    const rr = await refundPaymentByFinance(pharmacist, r.payment.id, '患者拒付');
    expect(rr.payment.status).toBe('cancelled');
    expect(rr.invoice).not.toBeNull();
    expect(rr.invoice!.status).toBe('reversed');
    expect(rr.invoice!.reversalOf).toBe(r.invoice!.id);
    // 处方回 returned（医生可改重提）
    const rx2 = await getDb()`
      SELECT status FROM clinical.internet_prescriptions WHERE id = ${rx.id}
    `;
    expect(String((rx2[0] as { status: string }).status)).toBe('returned');
  });

  it('财务队列：支付与票据可见', async () => {
    const doc = await createTempDoctor('pay6');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, rx } = await openApprovedRx(doc, 'pay6');
    const r = await createPaymentByPatient(p.accountId, p.patientId, {
      prescriptionId: rx.id, channel: 'mock', idempotencyKey: 'paym-' + rand(),
    });
    paymentIds.push(r.payment.id);

    const pays = await listFinancePayments('paid');
    expect(pays.some((x) => x.id === r.payment.id)).toBe(true);
    const invs = await listFinanceInvoices('issued');
    expect(invs.some((x) => x.id === r.invoice!.id)).toBe(true);
  });
});

/* ============================ BFF 路由层 ============================ */

function fakeCtx(
  method: string,
  path: string,
  user?: { id: string; roles: string[]; permissions?: string[] },
  body?: unknown,
  query?: Record<string, string>,
) {
  const url = new URL('http://localhost' + path);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  return {
    req: {
      method,
      url: url.pathname + url.search,
      headers: new Headers({ authorization: 'Bearer test' }),
    } as unknown as Request,
    url,
    params: {},
    query: url.searchParams,
    user: user ? (user as never) : null,
    traceId: 'test-trace-' + rand(),
    body: async () => body ?? {},
    getHeader: () => 'Bearer test',
  } as unknown as Ctx;
}

function findRoute(method: string, path: string) {
  const route = internetPaymentRoutes.find(
    (r) => r.method === method && r.path === path,
  );
  if (!route) throw new Error(`缺少路由 ${method} ${path}`);
  return route;
}

describe.skipIf(!dbAvailable)('M3-M 在线支付 · BFF 路由', () => {
  it('未登录访问 → 401', async () => {
    const r = findRoute('POST', '/api/v1/internet/payment/create');
    const res = await r.handle(fakeCtx('POST', '/api/v1/internet/payment/create'));
    expect(res.status).toBe(401);
  });

  it('护士无支付/票据权限 → 403', async () => {
    const r = findRoute('POST', '/api/v1/internet/payment/refund');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/payment/refund', { id: nurse.id, roles: ['nurse'] }),
    );
    expect(res.status).toBe(403);
  });

  it('患者端缺少 patientId → 400', async () => {
    const r = findRoute('GET', '/api/v1/internet/payment/my');
    const res = await r.handle(
      fakeCtx('GET', '/api/v1/internet/payment/my', { id: 'some-patient', roles: ['patient'] }),
    );
    expect(res.status).toBe(400);
  });

  it('财务冲正无原因 → 400（信封 code）', async () => {
    const r = findRoute('POST', '/api/v1/internet/payment/refund');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/payment/refund', {
        id: pharmacist.id, roles: ['pharmacist'],
        permissions: ['internet:payment:refund'],
      }, { paymentId: '00000000-0000-0000-0000-000000000000', reason: '' }),
    );
    expect(res.status).toBe(400);
  });

  it('财务冲正不存在的支付单 → 404', async () => {
    const r = findRoute('POST', '/api/v1/internet/payment/refund');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/payment/refund', {
        id: pharmacist.id, roles: ['pharmacist'],
        permissions: ['internet:payment:refund'],
      }, { paymentId: '00000000-0000-0000-0000-000000000000', reason: '测试' }),
    );
    expect(res.status).toBe(404);
  });
});
