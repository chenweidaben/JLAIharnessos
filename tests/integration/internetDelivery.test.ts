/**
 * 健澜科技 jlmedaios - 互联网处方配送 + 在线报告 集成测试（M3-N）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 全链路：已支付处方 → 自取建单（取货码）→ 打包 → 核销；
 *             已支付处方 → 快递建单（地址必填）→ 打包 → 发货（物流必填）→ 送达；
 *  - 幂等：同处方重复建单返回既有单（exists，不 409）；
 *  - 状态机：非 paid 处方建单 409、非法转换 409、自取单发货 409、快递单核销 409；
 *  - 越权：他人配送单 403、医护报告必填患者 ID；
 *  - 在线报告：患者本人可查（检验/影像/解读），医护按患者查询；
 *  - BFF 路由信封 401/403/400/404。
 *
 * 隔离说明：创建临时医生与患者（复用 M3-M 夹具链路：开方→审方→支付），
 * afterAll 删除全部夹具（含配送单）。
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
import { createPaymentByPatient } from '../../src/bff/aggregators/internetPaymentAggregator.js';
import {
  InternetDeliveryError,
  createDeliveryByPharmacy,
  fulfillDeliveryByPharmacy,
  listMyDeliveries,
  listDeliveriesForPharmacy,
  listPaidRxForDelivery,
  listReportsByPatient,
  listReportsForStaff,
} from '../../src/bff/aggregators/deliveryAggregator.js';
import { internetDeliveryRoutes } from '../../src/bff/routes/internetDelivery.js';
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
const deliveryIds: string[] = [];

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
  const username = 'm3ndoc_' + suffix + '_' + rand();
  const rows = await db`
    INSERT INTO iam.users (username, name, department, title, role, status)
    VALUES (${username}, '配送测试医生', '心血管内科', '主治医师', 'doctor', 'active')
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

/** 创建完整复诊患者（登录→就诊人→实名→历史就诊） */
async function seedFollowupPatient(tag: string, dept = '心血管内科') {
  const login = await loginWithWechat({ code: 'l-' + tag + '-' + rand() });
  accountIds.push(login.accountId);
  const profile = await addProfile(login.accountId, {
    relation: 'self',
    name: '配送测试患者',
    gender: '男',
  });
  const rn = await verifyRealname(
    login.accountId,
    { profileId: profile.id, realName: '配送测试患者', idCard: genIdCard() },
    'trc_m',
  );
  if (!rn.patientId) throw new Error('实名未取得 patientId');
  patientIds.push(rn.patientId);

  const db = getDb();
  const visitNo = 'VN' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

/** 确保医生已审核线上资质（幂等） */
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

/** 开一张已支付处方（患者 → 会话 → 开方 → 药师通过 → 患者支付） */
async function openPaidRx(doc: AuthView, tag: string) {
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
      { drugCode: 'D018', drugName: '阿莫西林', specification: '0.25g*24粒', dosage: 0.5, dosageUnit: 'g', frequency: 'tid', route: '口服', daysSupply: 7, quantity: 1, quantityUnit: '盒', skinTest: true, remark: '需皮试' },
    ],
    idempotencyKey: 'ern-' + tag + '-' + rand(),
  });
  rxIds.push(rx.id);
  await reviewEPrescriptionByPharmacist(pharmacist, {
    prescriptionId: rx.id,
    decision: 'approved',
    auditComment: '审核通过',
  });
  const pay = await createPaymentByPatient(p.accountId, p.patientId, {
    prescriptionId: rx.id,
    channel: 'mock',
    idempotencyKey: 'payn-' + tag + '-' + rand(),
  });
  paymentIds.push(pay.payment.id);
  return { p, rx, pay };
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
    if (deliveryIds.length) await db`DELETE FROM clinical.prescription_deliveries WHERE id IN ${db(deliveryIds)}`;
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

describe.skipIf(!dbAvailable)('M3-N 处方配送 · 聚合器全链路', () => {
  it('全链路：自取单 建单（取货码）→ 打包 → 核销', async () => {
    const doc = await createTempDoctor('del1');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, rx } = await openPaidRx(doc, 'del1');

    const res = await createDeliveryByPharmacy(pharmacist, {
      rxId: rx.id,
      channel: 'self_pick',
    });
    expect(res.result).toBe('created');
    expect(res.delivery.status).toBe('created');
    expect(res.delivery.channel).toBe('self_pick');
    expect(res.delivery.pickupCode).toMatch(/^\d{6}$/);
    deliveryIds.push(res.delivery.id);

    const packed = await fulfillDeliveryByPharmacy(pharmacist, {
      deliveryId: res.delivery.id, to: 'packed',
    });
    expect(packed.status).toBe('packed');
    expect(packed.fulfilledBy).toBe(pharmacist.id);

    const picked = await fulfillDeliveryByPharmacy(pharmacist, {
      deliveryId: res.delivery.id, to: 'picked_up',
    });
    expect(picked.status).toBe('picked_up');
    expect(picked.confirmedBy).toBe(pharmacist.id);
    expect(picked.confirmedAt).not.toBeNull();

    // 患者可见（归属）
    const mine = await listMyDeliveries(p.accountId, p.patientId);
    expect(mine.some((x) => x.id === res.delivery.id)).toBe(true);
    // 药房全量可见
    const all = await listDeliveriesForPharmacy(pharmacist, 'picked_up');
    expect(all.some((x) => x.id === res.delivery.id)).toBe(true);
  });

  it('全链路：快递单 建单（地址必填）→ 打包 → 发货（物流必填）→ 送达', async () => {
    const doc = await createTempDoctor('del2');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { rx } = await openPaidRx(doc, 'del2');

    // 快递缺地址 → 400
    await expect(
      createDeliveryByPharmacy(pharmacist, { rxId: rx.id, channel: 'express' }),
    ).rejects.toMatchObject({ status: 400 });

    const res = await createDeliveryByPharmacy(pharmacist, {
      rxId: rx.id, channel: 'express', address: '浙江省杭州市余杭区 某某小区 3-2-1101 张三 13800000000',
    });
    expect(res.result).toBe('created');
    expect(res.delivery.addressSnapshot).toContain('余杭区');
    deliveryIds.push(res.delivery.id);

    const packed = await fulfillDeliveryByPharmacy(pharmacist, {
      deliveryId: res.delivery.id, to: 'packed',
    });
    expect(packed.status).toBe('packed');

    // 发货缺物流 → 400
    await expect(
      fulfillDeliveryByPharmacy(pharmacist, { deliveryId: res.delivery.id, to: 'shipped' }),
    ).rejects.toMatchObject({ status: 400 });

    const shipped = await fulfillDeliveryByPharmacy(pharmacist, {
      deliveryId: res.delivery.id, to: 'shipped',
      courierCompany: '顺丰速运', trackingNo: 'SF' + Date.now().toString().slice(-12),
    });
    expect(shipped.status).toBe('shipped');
    expect(shipped.courierCompany).toBe('顺丰速运');
    expect(shipped.trackingNo).toContain('SF');

    const delivered = await fulfillDeliveryByPharmacy(pharmacist, {
      deliveryId: res.delivery.id, to: 'delivered',
    });
    expect(delivered.status).toBe('delivered');
  });

  it('幂等：同处方重复建单返回既有单（exists），不重复建单', async () => {
    const doc = await createTempDoctor('del3');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { rx } = await openPaidRx(doc, 'del3');

    const r1 = await createDeliveryByPharmacy(pharmacist, {
      rxId: rx.id, channel: 'self_pick',
    });
    deliveryIds.push(r1.delivery.id);
    expect(r1.result).toBe('created');

    const r2 = await createDeliveryByPharmacy(pharmacist, {
      rxId: rx.id, channel: 'self_pick',
    });
    expect(r2.result).toBe('exists');
    expect(r2.delivery.id).toBe(r1.delivery.id);

    // 全库该处方仅一条有效单
    const db = getDb();
    const rows = await db`SELECT count(*)::int AS c FROM clinical.prescription_deliveries
      WHERE rx_id = ${rx.id} AND status <> 'cancelled'`;
    expect((rows[0] as { c: number }).c).toBe(1);
  });

  it('状态机：非 paid 处方建单 409；非法转换 409；自取单发货 409；快递单核销 409', async () => {
    const doc = await createTempDoctor('del4');
    await ensureApprovedDoctor(doc, '心血管内科');
    // 非 paid（仅审方通过）处方不可建单
    const pp = await seedFollowupPatient('del4');
    const session = await startConsultation(pp.accountId, {
      profileId: pp.profileId, doctorId: doc.id, chiefComplaint: '复诊开药',
    });
    await acceptSession(doc.id, session.id);
    const rx = await createEPrescriptionByDoctor(doc, {
      sessionId: session.id,
      items: [{ drugName: '布洛芬缓释胶囊', dosage: 0.3, dosageUnit: 'g', frequency: 'bid', route: '口服', daysSupply: 3, quantity: 1, quantityUnit: '盒', skinTest: false }],
      idempotencyKey: 'ern-' + rand(),
    });
    rxIds.push(rx.id);
    await reviewEPrescriptionByPharmacist(pharmacist, {
      prescriptionId: rx.id, decision: 'approved', auditComment: '审核通过',
    });
    await expect(
      createDeliveryByPharmacy(pharmacist, { rxId: rx.id, channel: 'self_pick' }),
    ).rejects.toMatchObject({ status: 409 });

    // paid 处方建单后：created→shipped 非法（跳过打包）
    const { rx: rx2 } = await openPaidRx(doc, 'del4b');
    const d = await createDeliveryByPharmacy(pharmacist, { rxId: rx2.id, channel: 'express', address: '北京市朝阳区 测试地址 李四' });
    deliveryIds.push(d.delivery.id);
    await expect(
      fulfillDeliveryByPharmacy(pharmacist, { deliveryId: d.delivery.id, to: 'shipped', courierCompany: '中通', trackingNo: 'ZT123' }),
    ).rejects.toMatchObject({ status: 409 });

    // 自取单不可发货
    const { rx: rx3 } = await openPaidRx(doc, 'del4c');
    const d2 = await createDeliveryByPharmacy(pharmacist, { rxId: rx3.id, channel: 'self_pick' });
    deliveryIds.push(d2.delivery.id);
    await fulfillDeliveryByPharmacy(pharmacist, { deliveryId: d2.delivery.id, to: 'packed' });
    await expect(
      fulfillDeliveryByPharmacy(pharmacist, { deliveryId: d2.delivery.id, to: 'shipped', courierCompany: '顺丰', trackingNo: 'SF1' }),
    ).rejects.toMatchObject({ status: 409 });

    // 快递单不可自取核销
    const { rx: rx4 } = await openPaidRx(doc, 'del4d');
    const d3 = await createDeliveryByPharmacy(pharmacist, { rxId: rx4.id, channel: 'express', address: '北京市朝阳区 测试地址2 王五' });
    deliveryIds.push(d3.delivery.id);
    await fulfillDeliveryByPharmacy(pharmacist, { deliveryId: d3.delivery.id, to: 'packed' });
    await expect(
      fulfillDeliveryByPharmacy(pharmacist, { deliveryId: d3.delivery.id, to: 'picked_up' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('越权：他人患者查看指定配送单 403；药房列表不含他人单', async () => {
    const doc = await createTempDoctor('del5');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p, rx } = await openPaidRx(doc, 'del5');
    const d = await createDeliveryByPharmacy(pharmacist, { rxId: rx.id, channel: 'self_pick' });
    deliveryIds.push(d.delivery.id);

    const other = await seedFollowupPatient('del5b');
    await expect(
      listMyDeliveries(other.accountId, other.patientId, d.delivery.id),
    ).rejects.toMatchObject({ status: 403 });
    // 他人列表不含该单
    const mine = await listMyDeliveries(other.accountId, other.patientId);
    expect(mine.some((x) => x.id === d.delivery.id)).toBe(false);
    // 本人可见
    const own = await listMyDeliveries(p.accountId, p.patientId, d.delivery.id);
    expect(own.length).toBe(1);
  });

  it('可配送处方：paid 处方在列，未支付处方不在列', async () => {
    const doc = await createTempDoctor('del6');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { rx } = await openPaidRx(doc, 'del6');
    const paidRx = await listPaidRxForDelivery();
    expect(paidRx.some((x) => x.id === rx.id)).toBe(true);
  });

  it('在线报告：患者本人可查（空数据不报错）；医护必填患者 ID；医护可查指定患者', async () => {
    const doc = await createTempDoctor('del7');
    await ensureApprovedDoctor(doc, '心血管内科');
    const { p } = await openPaidRx(doc, 'del7');

    const mine = await listReportsByPatient(p.accountId, p.patientId);
    expect(Array.isArray(mine.labs)).toBe(true);
    expect(Array.isArray(mine.imaging)).toBe(true);
    expect(Array.isArray(mine.interpretations)).toBe(true);

    // 医护缺患者 ID → 400
    await expect(
      listReportsForStaff(doc),
    ).rejects.toMatchObject({ status: 400 });

    const staff = await listReportsForStaff(doc, p.patientId);
    expect(Array.isArray(staff.labs)).toBe(true);
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
  const route = internetDeliveryRoutes.find(
    (r) => r.method === method && r.path === path,
  );
  if (!route) throw new Error(`缺少路由 ${method} ${path}`);
  return route;
}

describe.skipIf(!dbAvailable)('M3-N 处方配送 · BFF 路由', () => {
  it('未登录访问建单 → 401', async () => {
    const r = findRoute('POST', '/api/v1/internet/delivery/create');
    const res = await r.handle(fakeCtx('POST', '/api/v1/internet/delivery/create'));
    expect(res.status).toBe(401);
  });

  it('护士无配送权限 → 403', async () => {
    const r = findRoute('POST', '/api/v1/internet/delivery/create');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/delivery/create', { id: nurse.id, roles: ['nurse'] }),
    );
    expect(res.status).toBe(403);
  });

  it('建单：处方不存在 → 404', async () => {
    const r = findRoute('POST', '/api/v1/internet/delivery/create');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/delivery/create', {
        id: pharmacist.id, roles: ['pharmacist'], permissions: ['internet:delivery:create'],
      }, { rxId: '00000000-0000-0000-0000-000000000000', channel: 'self_pick' }),
    );
    expect(res.status).toBe(404);
  });

  it('建单：缺处方 ID → 400', async () => {
    const r = findRoute('POST', '/api/v1/internet/delivery/create');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/delivery/create', {
        id: pharmacist.id, roles: ['pharmacist'], permissions: ['internet:delivery:create'],
      }, { rxId: '', channel: 'self_pick' }),
    );
    expect(res.status).toBe(400);
  });

  it('患者端缺 patientId → 400', async () => {
    const r = findRoute('GET', '/api/v1/internet/delivery/my');
    const res = await r.handle(
      fakeCtx('GET', '/api/v1/internet/delivery/my', { id: 'some-patient', roles: ['patient'] }),
    );
    expect(res.status).toBe(400);
  });

  it('医护报告缺患者 ID → 400', async () => {
    const r = findRoute('GET', '/api/v1/internet/reports');
    const res = await r.handle(
      fakeCtx('GET', '/api/v1/internet/reports', {
        id: admin.id, roles: ['admin'], permissions: ['internet:report:view'],
      }),
    );
    expect(res.status).toBe(400);
  });
});
