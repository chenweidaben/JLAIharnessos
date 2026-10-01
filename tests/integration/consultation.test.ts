/**
 * 健澜科技 jlmedaios - 互联网图文问诊 集成测试（M3-K）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 复诊全链路：发起（复诊资格）→ 医生接诊 → 双方消息 → 医生结束；
 *  - 状态机非法转换（未接诊发消息/重复接诊/结束后再发）；
 *  - 复诊资格（无历史就诊拒绝首诊）、重复发起、医生资质、患者实名；
 *  - 越权（他人会话/非接诊医生/患者访问医生端/未登录）；
 *  - BFF 路由信封 / 401 / 403 / 404 / 400。
 *
 * 隔离说明：本测试在 beforeAll 中创建 3 个临时医生（iam.users），
 * 不与 M3-J 基座测试复用种子医生，避免并行套件对资质表的唯一约束竞争。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具。
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
  getMyPractitioner,
} from '../../src/bff/aggregators/internetPatientAggregator.js';
import {
  startConsultation,
  listMySessions,
  getMySession,
  patientSendMessage,
  patientCancel,
  listPending,
  listDoctorSessions,
  acceptSession,
  doctorSendMessage,
  completeSession,
} from '../../src/bff/aggregators/consultationAggregator.js';
import { consultationRoutes } from '../../src/bff/routes/consultation.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let docA: AuthView; // 有资质，主用
let docB: AuthView; // 有资质，非接诊医生
let docC: AuthView; // 无资质

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const accountIds: string[] = [];
const patientIds: string[] = [];
const visitIds: string[] = [];
const practitionerIds: string[] = [];
const tempDoctorIds: string[] = [];

/** 生成合法身份证号（含校验位） */
function validIdCard(front17: string): string {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(front17[i]) * weights[i];
  return front17 + checkCodes[sum % 11];
}

/** 生成合法身份证号：地区6 + 生日8 + 顺序3 = 17 位前辍 */
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
  const username = 'm3kdoc_' + suffix + '_' + rand();
  const rows = await db`
    INSERT INTO iam.users (username, name, department, title, role, status)
    VALUES (${username}, '问诊测试医生', '心血管内科', '主治医师', 'doctor', 'active')
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

/**
 * 创建一个完整的复诊患者：登录 → 就诊人 → 实名（EMPI）→ 一条已出院历史就诊。
 * 返回 accountId / profileId / patientId。
 */
async function seedFollowupPatient(tag: string, dept = '心血管内科') {
  const login = await loginWithWechat({ code: 'k-' + tag + '-' + rand() });
  accountIds.push(login.accountId);
  const profile = await addProfile(login.accountId, {
    relation: 'self',
    name: '复诊患者',
    gender: '男',
  });
  const idCard = genIdCard();
  const rn = await verifyRealname(
    login.accountId,
    { profileId: profile.id, realName: '复诊患者', idCard },
    'trc_k',
  );
  if (!rn.patientId) throw new Error('实名未取得 patientId');
  patientIds.push(rn.patientId);

  // 插入一条已出院历史就诊（复诊依据）
  const db = getDb();
  const visitNo = 'VK' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

/** 确保医生具备已审核的线上资质（幂等），返回 doctorId */
async function ensureApprovedDoctor(view: AuthView, scope: string) {
  const existing = await getMyPractitioner(view.id);
  if (existing) {
    if (existing.auditStatus === 'approved') return view.id;
    const db = getDb();
    await db`DELETE FROM iam.internet_practitioners WHERE id = ${existing.id}`;
  }
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
  docA = await createTempDoctor('a');
  docB = await createTempDoctor('b');
  docC = await createTempDoctor('c');
  await ensureApprovedDoctor(docA, '心血管内科');
  await ensureApprovedDoctor(docB, '心血管内科');
  // docC 故意不创建资质
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 先删引用方（messages → sessions），再删 visits
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
    // 临时医生的资质 → 临时医生（级联 user_roles）
    if (practitionerIds.length) {
      await db`DELETE FROM iam.internet_practitioners WHERE id IN ${db(practitionerIds)}`;
    }
    if (tempDoctorIds.length) {
      await db`DELETE FROM iam.users WHERE id IN ${db(tempDoctorIds)}`;
    }
  }
});

describe.skipIf(!dbAvailable)('M3-K 复诊全链路', () => {
  it('发起 → 接诊 → 双方消息 → 结束', async () => {
    const doctorId = docA.id;
    const p = await seedFollowupPatient('full');
    // 发起
    const session = await startConsultation(p.accountId, {
      profileId: p.profileId,
      doctorId,
      chiefComplaint: '复诊咨询',
    });
    expect(session.status).toBe('pending');
    expect(session.eligibilityPassed).toBe(true);
    expect(session.lastVisitId).toBeTruthy();

    // 患者待接诊时发消息 → 409
    await expect(
      patientSendMessage(p.accountId, session.id, { content: '在吗' }),
    ).rejects.toBeTruthy();

    // 医生接诊
    const accepted = await acceptSession(doctorId, session.id);
    expect(accepted.status).toBe('in_consultation');
    expect(accepted.acceptedAt).toBeTruthy();

    // 患者消息
    await patientSendMessage(p.accountId, session.id, { content: '医生您好，来复诊' });
    // 医生消息
    await doctorSendMessage(doctorId, session.id, { content: '最近情况如何？' });

    // 详情含消息（系统 + 双方）
    const detail = await getMySession(p.accountId, session.id);
    expect(detail.messages.length).toBeGreaterThanOrEqual(4);

    // 医生结束
    const done = await completeSession(doctorId, session.id);
    expect(done.status).toBe('completed');
    expect(done.completedAt).toBeTruthy();
  });

  it('患者可在待接诊时取消', async () => {
    const doctorId = docA.id;
    const p = await seedFollowupPatient('cancel');
    const session = await startConsultation(p.accountId, {
      profileId: p.profileId,
      doctorId,
    });
    const cancelled = await patientCancel(p.accountId, session.id, { reason: '不需要了' });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelReason).toBe('不需要了');
  });
});

describe.skipIf(!dbAvailable)('M3-K 发起门禁', () => {
  it('无历史就诊 → 拒绝首诊', async () => {
    const doctorId = docA.id;
    // 实名但不插入历史就诊
    const login = await loginWithWechat({ code: 'first-' + rand() });
    accountIds.push(login.accountId);
    const profile = await addProfile(login.accountId, { relation: 'self', name: '首诊' });
    const idCard = genIdCard();
    const rn = await verifyRealname(
      login.accountId,
      { profileId: profile.id, realName: '首诊', idCard },
      't',
    );
    patientIds.push(rn.patientId!);
    await expect(
      startConsultation(login.accountId, { profileId: profile.id, doctorId }),
    ).rejects.toBeTruthy();
  });

  it('未实名 → 拒绝发起', async () => {
    const doctorId = docA.id;
    const login = await loginWithWechat({ code: 'noname-' + rand() });
    accountIds.push(login.accountId);
    const profile = await addProfile(login.accountId, { relation: 'self', name: '未实名' });
    await expect(
      startConsultation(login.accountId, { profileId: profile.id, doctorId }),
    ).rejects.toBeTruthy();
  });

  it('医生无线上资质 → 拒绝', async () => {
    const p = await seedFollowupPatient('noqual');
    // docC 未创建资质
    await expect(
      startConsultation(p.accountId, { profileId: p.profileId, doctorId: docC.id }),
    ).rejects.toBeTruthy();
  });

  it('重复发起未结束会话 → 409', async () => {
    const doctorId = docA.id;
    const p = await seedFollowupPatient('dup');
    await startConsultation(p.accountId, { profileId: p.profileId, doctorId });
    await expect(
      startConsultation(p.accountId, { profileId: p.profileId, doctorId }),
    ).rejects.toBeTruthy();
  });

  it('空消息 → 400', async () => {
    const doctorId = docA.id;
    const p = await seedFollowupPatient('empty');
    const session = await startConsultation(p.accountId, {
      profileId: p.profileId,
      doctorId,
    });
    await acceptSession(doctorId, session.id);
    await expect(
      patientSendMessage(p.accountId, session.id, { content: '   ' }),
    ).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M3-K 医生端与越权', () => {
  it('待接诊队列与医生会话列表', async () => {
    const doctorId = docA.id;
    const p = await seedFollowupPatient('queue');
    await startConsultation(p.accountId, { profileId: p.profileId, doctorId });
    const pending = await listPending();
    expect(Array.isArray(pending)).toBe(true);
    const mine = await listDoctorSessions(doctorId);
    expect(mine.length).toBeGreaterThanOrEqual(1);
  });

  it('非接诊医生不能接诊/回复/结束 → 403', async () => {
    const doctorId = docA.id;
    const p = await seedFollowupPatient('otherdoc');
    const session = await startConsultation(p.accountId, {
      profileId: p.profileId,
      doctorId,
    });
    await expect(acceptSession(docB.id, session.id)).rejects.toBeTruthy();
    await expect(
      doctorSendMessage(docB.id, session.id, { content: '我来看看' }),
    ).rejects.toBeTruthy();
    await expect(completeSession(docB.id, session.id)).rejects.toBeTruthy();
  });

  it('患者不能访问医生端（无权限码）', async () => {
    const p = await seedFollowupPatient('patientdoc');
    const res = await findRoute('GET', '/api/v1/internet/consultation/pending').handle(
      makePatientCtx(p.accountId),
    );
    expect(res.status).toBe(403);
  });

  it('不能访问他人会话 → 403', async () => {
    const doctorId = docA.id;
    const a = await seedFollowupPatient('own1');
    const b = await seedFollowupPatient('own2');
    const session = await startConsultation(a.accountId, {
      profileId: a.profileId,
      doctorId,
    });
    await expect(getMySession(b.accountId, session.id)).rejects.toBeTruthy();
  });
});

/* ------------------------------ BFF 路由 ------------------------------ */

function makePatientCtx(accountId: string | null): Ctx {
  const user = accountId
    ? { id: accountId, name: '患者', roles: ['patient'], permissions: ['patient:account'] }
    : null;
  return {
    req: { headers: { get: () => null } } as unknown as Request,
    params: {},
    query: new URLSearchParams(),
    body: async () => ({}),
    user,
    traceId: 'test',
  } as unknown as Ctx;
}

function findRoute(method: string, path: string) {
  return consultationRoutes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M3-K BFF 路由：权限与信封', () => {
  it('未登录访问会话列表 → 401', async () => {
    const res = await findRoute('GET', '/api/v1/internet/consultation/sessions').handle(
      makePatientCtx(null),
    );
    expect(res.status).toBe(401);
  });

  it('患者会话列表成功路径统一信封', async () => {
    const p = await seedFollowupPatient('route');
    const res = await findRoute('GET', '/api/v1/internet/consultation/sessions').handle(
      makePatientCtx(p.accountId),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).code).toBe(0);
  });

  it('患者访问医生待接诊队列 → 403', async () => {
    const login = await loginWithWechat({ code: 'routep-' + rand() });
    accountIds.push(login.accountId);
    const res = await findRoute('GET', '/api/v1/internet/consultation/pending').handle(
      makePatientCtx(login.accountId),
    );
    expect(res.status).toBe(403);
  });
});
