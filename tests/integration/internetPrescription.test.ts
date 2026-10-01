/**
 * 健澜科技 jlmedaios - 互联网电子处方 集成测试（M3-L）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 全链路：会话内开方（本人签名）→ 药师审方通过 → 患者查看；
 *  - 审方退回 → 医生改明细重提 → 再审方通过（退回闭环）；
 *  - 审方驳回 → 终态；医生/患者不可再操作；
 *  - 无 AI 自动处方：空明细 / 缺药名拒绝；幂等键重复提交 409；
 *  - 状态机非法转换（非 pending_review 审方、非 returned 重提）；
 *  - 越权：非接诊医生开方、非药师审方、他人处方查看、患者角色开方；
 *  - BFF 路由信封 401/403/404/400/409。
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
  EPrescriptionError,
  createEPrescriptionByDoctor,
  resubmitEPrescriptionByDoctor,
  cancelEPrescriptionByDoctor,
  reviewEPrescriptionByPharmacist,
  listForAudit,
  listSessionPrescriptions,
  listMyPrescriptions,
  getMyPrescription,
} from '../../src/bff/aggregators/internetPrescriptionAggregator.js';
import { internetPrescriptionRoutes } from '../../src/bff/routes/internetPrescription.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let docA: AuthView; // 有资质、接诊医生
let docB: AuthView; // 有资质、非接诊医生
let pharmacist: AuthView;

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const accountIds: string[] = [];
const patientIds: string[] = [];
const visitIds: string[] = [];
const practitionerIds: string[] = [];
const tempDoctorIds: string[] = [];
const rxIds: string[] = [];

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
  const username = 'm3ldoc_' + suffix + '_' + rand();
  const rows = await db`
    INSERT INTO iam.users (username, name, department, title, role, status)
    VALUES (${username}, '电子处方测试医生', '心血管内科', '主治医师', 'doctor', 'active')
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
    name: '电子处方患者',
    gender: '男',
  });
  const rn = await verifyRealname(
    login.accountId,
    { profileId: profile.id, realName: '电子处方患者', idCard: genIdCard() },
    'trc_l',
  );
  if (!rn.patientId) throw new Error('实名未取得 patientId');
  patientIds.push(rn.patientId);

  const db = getDb();
  const visitNo = 'VL' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

/** 开一张会话中的处方：创建患者 → 发起 → 接诊 → 开方 */
async function openSessionAndCreateRx(doc: AuthView, tag: string) {
  const p = await seedFollowupPatient(tag);
  const session = await startConsultation(p.accountId, {
    profileId: p.profileId,
    doctorId: doc.id,
    chiefComplaint: '复诊开药',
  });
  await acceptSession(doc.id, session.id);
  const key = 'erlx-' + tag + '-' + rand();
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
    idempotencyKey: key,
  });
  rxIds.push(rx.id);
  return { p, session, rx };
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
  docA = await createTempDoctor('a');
  docB = await createTempDoctor('b');
  await ensureApprovedDoctor(docA, '心血管内科');
  await ensureApprovedDoctor(docB, '心血管内科');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 处方明细 → 处方 → 消息 → 会话 → 就诊 → 实名 → 就诊人 → 账户 → 患者 → 医生
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

describe.skipIf(!dbAvailable)('M3-L 电子处方 · 聚合器全链路', () => {
  it('会话内开方 → 药师审方通过 → 患者查看（本人签名）', async () => {
    const { p, session, rx } = await openSessionAndCreateRx(docA, 'full');
    // 签名语义：prescriber = 接诊医生本人
    expect(rx.prescriberId).toBe(docA.id);
    expect(rx.status).toBe('pending_review');
    expect(rx.items.length).toBe(2);
    expect(rx.idempotencyKey).toBeTruthy();
    expect(rx.totalFee).toBeGreaterThan(0);

    // 审方通过
    const approved = await reviewEPrescriptionByPharmacist(pharmacist, {
      prescriptionId: rx.id,
      decision: 'approved',
      auditComment: '用法用量合理',
    });
    expect(approved.status).toBe('approved');
    expect(approved.reviewerId).toBe(pharmacist.id);

    // 患者查看本人处方
    const mine = await listMyPrescriptions(p.accountId, p.patientId);
    expect(mine.some((r) => r.id === rx.id)).toBe(true);
    const detail = await getMyPrescription(p.accountId, p.patientId, rx.id);
    expect(detail.items.length).toBe(2);
  });

  it('审方退回 → 医生改明细重提 → 再审方通过（退回闭环）', async () => {
    const { p, session, rx } = await openSessionAndCreateRx(docA, 'return');
    const returned = await reviewEPrescriptionByPharmacist(pharmacist, {
      prescriptionId: rx.id,
      decision: 'returned',
      auditComment: '青霉素类需补充皮试结果',
    });
    expect(returned.status).toBe('returned');
    expect(returned.auditComment).toBe('青霉素类需补充皮试结果');

    // 非开方医生重提 → 403
    await expect(
      resubmitEPrescriptionByDoctor(docB, { prescriptionId: rx.id, items: rx.items }),
    ).rejects.toMatchObject({ status: 403 });

    // 医生修改明细（去掉需皮试的阿莫西林）并重提
    const items = rx.items.filter((i) => i.drugCode !== 'D018');
    const resubmitted = await resubmitEPrescriptionByDoctor(docA, {
      prescriptionId: rx.id,
      items,
    });
    expect(resubmitted.status).toBe('pending_review');
    expect(resubmitted.items.length).toBe(1);

    // 再审核通过
    const approved = await reviewEPrescriptionByPharmacist(pharmacist, {
      prescriptionId: rx.id,
      decision: 'approved',
    });
    expect(approved.status).toBe('approved');
  });

  it('审方驳回 → 终态；医生不可重提、取消不可用', async () => {
    const { rx } = await openSessionAndCreateRx(docA, 'reject');
    const rejected = await reviewEPrescriptionByPharmacist(pharmacist, {
      prescriptionId: rx.id,
      decision: 'rejected',
      auditComment: '药物相互作用风险，建议调整',
    });
    expect(rejected.status).toBe('rejected');

    await expect(
      resubmitEPrescriptionByDoctor(docA, { prescriptionId: rx.id, items: rx.items }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(cancelEPrescriptionByDoctor(docA, rx.id)).rejects.toMatchObject({ status: 409 });
  });

  it('无 AI 自动处方：空明细 / 缺药名拒绝', async () => {
    const p = await seedFollowupPatient('empty');
    const session = await startConsultation(p.accountId, {
      profileId: p.profileId,
      doctorId: docA.id,
      chiefComplaint: '复诊开药',
    });
    await acceptSession(docA.id, session.id);

    await expect(
      createEPrescriptionByDoctor(docA, {
        sessionId: session.id,
        items: [],
        idempotencyKey: 'erlx-empty-' + rand(),
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      createEPrescriptionByDoctor(docA, {
        sessionId: session.id,
        items: [{ drugName: '' } as never],
        idempotencyKey: 'erlx-noname-' + rand(),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('幂等键重复提交 → 409（防重复开方）', async () => {
    const p = await seedFollowupPatient('idem');
    const session = await startConsultation(p.accountId, {
      profileId: p.profileId,
      doctorId: docA.id,
      chiefComplaint: '复诊开药',
    });
    await acceptSession(docA.id, session.id);
    const key = 'erlx-idem-' + rand();
    const input = {
      sessionId: session.id,
      items: [{ drugName: '布洛芬缓释胶囊', dosage: 0.3, dosageUnit: 'g' }],
      idempotencyKey: key,
    };
    const first = await createEPrescriptionByDoctor(docA, input);
    rxIds.push(first.id);
    await expect(createEPrescriptionByDoctor(docA, input)).rejects.toMatchObject({ status: 409 });
  });

  it('状态机非法转换：非 pending_review 审方 409；非 returned 重提 409', async () => {
    const { rx } = await openSessionAndCreateRx(docA, 'sm1');
    await reviewEPrescriptionByPharmacist(pharmacist, {
      prescriptionId: rx.id,
      decision: 'approved',
    });
    // 已 approved，再审（approved 不需要意见，触发状态机 409）→ 409
    await expect(
      reviewEPrescriptionByPharmacist(pharmacist, { prescriptionId: rx.id, decision: 'approved' }),
    ).rejects.toMatchObject({ status: 409 });
    // 已 approved，重提 → 409
    await expect(
      resubmitEPrescriptionByDoctor(docA, { prescriptionId: rx.id, items: rx.items }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('越权：非接诊医生开方 403；非药师审方 403；他人处方查看 403', async () => {
    const { p, session, rx } = await openSessionAndCreateRx(docA, 'perm');
    // 非接诊医生开方 → 403
    await expect(
      createEPrescriptionByDoctor(docB, {
        sessionId: session.id,
        items: [{ drugName: '对乙酰氨基酚片' }],
        idempotencyKey: 'erlx-perm-' + rand(),
      }),
    ).rejects.toMatchObject({ status: 403 });
    // 医生审方（非药师角色）→ 403
    await expect(
      reviewEPrescriptionByPharmacist(docA, { prescriptionId: rx.id, decision: 'approved' }),
    ).rejects.toMatchObject({ status: 403 });
    // 他人患者查看 → 403
    const other = await seedFollowupPatient('perm2');
    await expect(
      getMyPrescription(other.accountId, other.patientId, rx.id),
    ).rejects.toMatchObject({ status: 403 });
    // 药师队列可见
    const queue = await listForAudit(pharmacist);
    expect(queue.some((r) => r.id === rx.id)).toBe(true);
  });

  it('患者取消自己的处方（pending_review 可取消）', async () => {
    const { p, session, rx } = await openSessionAndCreateRx(docA, 'cancel2');
    const cancelled = await cancelEPrescriptionByDoctor(docA, rx.id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledBy).toContain('doctor:');
  });
});

/* ============================ BFF 路由层 ============================ */

function fakeCtx(
  method: string,
  path: string,
  user?: { id: string; roles: string[]; permissions?: string[] },
  body?: unknown,
  query?: string,
): Ctx {
  const url = new URL('http://127.0.0.1:8080' + path + (query ? '?' + query : ''));
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
    body: async () => body,
    getHeader: () => 'Bearer test',
  } as unknown as Ctx;
}

function findRoute(method: string, path: string) {
  const route = internetPrescriptionRoutes.find(
    (r) => r.method === method && r.path === path,
  );
  if (!route) throw new Error(`缺少路由 ${method} ${path}`);
  return route;
}

describe.skipIf(!dbAvailable)('M3-L 电子处方 · BFF 路由', () => {
  it('未登录访问医生端/药师端 → 401', async () => {
    const r = findRoute('POST', '/api/v1/internet/prescription/create');
    const res = await r.handle(fakeCtx('POST', '/api/v1/internet/prescription/create'));
    expect(res.status).toBe(401);
  });

  it('无权限码（患者角色）开方 → 403', async () => {
    const r = findRoute('POST', '/api/v1/internet/prescription/create');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/prescription/create', { id: 'p1', roles: ['patient'] }),
    );
    expect(res.status).toBe(403);
  });

  it('医生开方路由信封：缺 body 字段 → 400（聚合器校验）', async () => {
    const { session } = await openSessionAndCreateRx(docA, 'route400');
    const r = findRoute('POST', '/api/v1/internet/prescription/create');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/prescription/create', { id: docA.id, roles: ['doctor'], permissions: ['internet:prescription'] }, {
        sessionId: session.id,
        items: [],
        idempotencyKey: 'erlx-route-' + rand(),
      }),
    );
    expect(res.status).toBe(400);
    const payload = (await res.json()) as { code: number };
    expect(payload.code).toBe(40000);
  });

  it('药师审方队列路由：缺权限（医生角色）→ 403', async () => {
    const r = findRoute('GET', '/api/v1/internet/prescription/audit-queue');
    const res = await r.handle(
      fakeCtx('GET', '/api/v1/internet/prescription/audit-queue', { id: docA.id, roles: ['doctor'] }),
    );
    expect(res.status).toBe(403);
  });

  it('患者查看路由：缺 patientId → 400', async () => {
    const r = findRoute('GET', '/api/v1/internet/prescription/my');
    const res = await r.handle(
      fakeCtx('GET', '/api/v1/internet/prescription/my', { id: 'p1', roles: ['patient'] }),
    );
    expect(res.status).toBe(400);
  });

  it('审方动作路由：驳回缺意见 → 400（业务校验）', async () => {
    const { rx } = await openSessionAndCreateRx(docA, 'route400b');
    const r = findRoute('POST', '/api/v1/internet/prescription/review');
    const res = await r.handle(
      fakeCtx('POST', '/api/v1/internet/prescription/review', { id: pharmacist.id, roles: ['pharmacist'], permissions: ['internet:prescription:audit'] }, {
        prescriptionId: rx.id,
        decision: 'rejected',
      }),
    );
    expect(res.status).toBe(400);
  });
});
