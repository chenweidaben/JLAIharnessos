/**
 * 健澜科技 jlmedaios - 互联网医院基座 集成测试（M3-J）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 微信登录（code 换 token，本地演示）；
 *  - 就诊人添加/列表/上限；实名认证（通过/失败，EMPI 绑定/创建）；
 *  - 越权：不能访问他人就诊人；
 *  - 医护线上资质提交、审核（通过/驳回）、非法状态；
 *  - BFF 路由信封 / 401 / 403 / 404 / 400。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  loginWithWechat,
  addProfile,
  listMyProfiles,
  getMyProfile,
  verifyRealname,
  submitPractitioner,
  listPractitioners,
  auditPractitioner,
} from '../../src/bff/aggregators/internetPatientAggregator.js';
import { internetHospitalRoutes } from '../../src/bff/routes/internetHospital.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let doctorLi: AuthView;
let doctorLin: AuthView;
let doctorZhou: AuthView;
let pharmacist: AuthView;
let nurseZhao: AuthView;

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const accountIds: string[] = [];
const practitionerIds: string[] = [];

/** 生成合法身份证号（含校验位） */
function validIdCard(front17: string): string {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(front17[i]) * weights[i];
  return front17 + checkCodes[sum % 11];
}

/** 登录一个测试患者账号，返回 accountId */
async function loginAccount(code: string) {
  const r = await loginWithWechat({ code: 'test-' + code });
  accountIds.push(r.accountId);
  return r;
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
  doctorChen = await load('doctor_chen');
  doctorLi = await load('doctor_li');
  doctorLin = await load('doctor_lin');
  doctorZhou = await load('doctor_zhou');
  pharmacist = await load('pharmacist_wang');
  nurseZhao = await load('nurse_zhao');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 实名认证创建的患者：通过测试账号 profiles 的 patient_id 定位
    const patientRows = await db`
      SELECT DISTINCT patient_id FROM clinical.patient_profiles
       WHERE account_id IN ${db(accountIds)} AND patient_id IS NOT NULL
    `;
    const patientIds = (patientRows as unknown as { patient_id: string }[]).map((r) => r.patient_id);

    await db`
      DELETE FROM clinical.realname_verifications WHERE profile_id IN (
        SELECT id FROM clinical.patient_profiles WHERE account_id IN ${db(accountIds)}
      )
    `;
    await db`DELETE FROM clinical.patient_profiles WHERE account_id IN ${db(accountIds)}`;
    await db`DELETE FROM clinical.patient_accounts WHERE id IN ${db(accountIds)}`;
    if (patientIds.length > 0) {
      await db`DELETE FROM clinical.patients WHERE id IN ${db(patientIds)}`;
    }
    if (practitionerIds.length > 0) {
      await db`DELETE FROM iam.internet_practitioners WHERE id IN ${db(practitionerIds)}`;
    }
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-J 微信登录', () => {
  it('code 换 token，返回账号信息', async () => {
    const r = await loginAccount('login-' + rand());
    expect(r.token).toBeTruthy();
    expect(r.accountId).toBeTruthy();
    expect(r.openid).toContain('demo-openid-');
    expect(r.isDemoLogin).toBe(true);
  });

  it('空 code → 400', async () => {
    await expect(loginWithWechat({ code: '  ' })).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M3-J 就诊人管理', () => {
  it('添加就诊人（L1）并在列表中', async () => {
    const acc = await loginAccount('add-' + rand());
    const r = await addProfile(acc.accountId, {
      relation: 'self',
      name: '张三',
      gender: '男',
      birthDate: '1990-03-07',
      isDefault: true,
    });
    expect(r.authLevel).toBe(1);
    const list = await listMyProfiles(acc.accountId);
    expect(list.length).toBe(1);
    expect(list[0].nameMasked).toBeTruthy();
  });

  it('就诊人详情：脱敏姓名', async () => {
    const acc = await loginAccount('detail-' + rand());
    const p = await addProfile(acc.accountId, { relation: 'self', name: '李四' });
    const detail = await getMyProfile(acc.accountId, p.id);
    expect(detail.nameMasked).toBeTruthy();
  });

  it('不能访问他人就诊人 → 403', async () => {
    const a = await loginAccount('owner-' + rand());
    const b = await loginAccount('other-' + rand());
    const p = await addProfile(a.accountId, { relation: 'self', name: '王五' });
    await expect(getMyProfile(b.accountId, p.id)).rejects.toBeTruthy();
  });

  it('不存在就诊人 → 404', async () => {
    const acc = await loginAccount('nf-' + rand());
    await expect(getMyProfile(acc.accountId, crypto.randomUUID())).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M3-J 实名认证与 EMPI', () => {
  it('合法信息实名认证通过，绑定/创建 EMPI 患者', async () => {
    const acc = await loginAccount('rn-' + rand());
    const p = await addProfile(acc.accountId, { relation: 'self', name: '测试' });
    const idCard = validIdCard('11010119900307' + String(Math.floor(100 + Math.random() * 800)));
    const r = await verifyRealname(
      acc.accountId,
      { profileId: p.id, realName: '测试', idCard },
      'trc_test',
    );
    expect(r.passed).toBe(true);
    expect(r.patientId).toBeTruthy();
    expect(r.authLevel).toBe(2);
    expect(r.isDemo).toBe(true);
  });

  it('身份证校验位错误 → 认证失败', async () => {
    const acc = await loginAccount('rnbad-' + rand());
    const p = await addProfile(acc.accountId, { relation: 'self', name: '测试' });
    const r = await verifyRealname(
      acc.accountId,
      { profileId: p.id, realName: '测试', idCard: '110101199003071234' },
      'trc_test',
    );
    expect(r.passed).toBe(false);
  });

  it('同一身份证重复认证 → 绑定同一 EMPI（不重复建档）', async () => {
    const a = await loginAccount('dup1-' + rand());
    const b = await loginAccount('dup2-' + rand());
    const pa = await addProfile(a.accountId, { relation: 'self', name: '重复' });
    const pb = await addProfile(b.accountId, { relation: 'self', name: '重复' });
    const idCard = validIdCard('31010419850712' + String(Math.floor(100 + Math.random() * 800)));
    const ra = await verifyRealname(a.accountId, { profileId: pa.id, realName: '重复', idCard }, 't');
    const rb = await verifyRealname(b.accountId, { profileId: pb.id, realName: '重复', idCard }, 't');
    expect(ra.patientId).toBe(rb.patientId);
  });
});

describe.skipIf(!dbAvailable)('M3-J 医护线上资质', () => {
  it('医师提交资质 → 管理员审核通过', async () => {
    const s = await submitPractitioner(doctorChen.id, {
      practitionerNo: '110000000000001',
      practitionerType: 'doctor',
      practiceScope: '内科专业',
      practiceYears: 12,
    });
    practitionerIds.push(s.id);
    expect(s.auditStatus).toBe('pending');
    const updated = await auditPractitioner(s.id, admin.id, { decision: 'approved' });
    expect(updated.auditStatus).toBe('approved');
    expect(updated.approvedAt).toBeTruthy();
  });

  it('驳回必须填写理由', async () => {
    const s = await submitPractitioner(doctorLin.id, {
      practitionerType: 'doctor',
      practiceScope: '内科',
    });
    practitionerIds.push(s.id);
    await expect(
      auditPractitioner(s.id, admin.id, { decision: 'rejected' }),
    ).rejects.toBeTruthy();
  });

  it('已审核资质再次审核 → 409', async () => {
    const s = await submitPractitioner(doctorZhou.id, {
      practitionerType: 'doctor',
      practiceScope: '内科',
    });
    practitionerIds.push(s.id);
    await auditPractitioner(s.id, admin.id, { decision: 'approved' });
    await expect(
      auditPractitioner(s.id, admin.id, { decision: 'rejected', reason: 'x' }),
    ).rejects.toBeTruthy();
  });

  it('驳回（带理由）成功并记录理由', async () => {
    const s = await submitPractitioner(doctorLi.id, {
      practitionerType: 'doctor',
      practiceScope: '内科',
    });
    practitionerIds.push(s.id);
    const updated = await auditPractitioner(s.id, admin.id, {
      decision: 'rejected',
      reason: '执业范围填写不完整',
    });
    expect(updated.auditStatus).toBe('rejected');
    expect(updated.auditReason).toBe('执业范围填写不完整');
  });

  it('驳回后重新提交：重置为 pending，清空上一轮驳回理由', async () => {
    // 护士首次提交
    const first = await submitPractitioner(nurseZhao.id, {
      practitionerType: 'nurse',
      practiceScope: '护理',
    });
    practitionerIds.push(first.id);
    expect(first.auditStatus).toBe('pending');
    // 管理员驳回
    await auditPractitioner(first.id, admin.id, {
      decision: 'rejected',
      reason: '资料不全',
    });
    // 本人补充资料后重新提交
    const second = await submitPractitioner(nurseZhao.id, {
      practitionerType: 'nurse',
      practiceScope: '内科护理',
      practiceYears: 5,
    });
    expect(second.auditStatus).toBe('pending');
    expect(second.id).toBe(first.id);
    // 重新审核可通过
    const approved = await auditPractitioner(first.id, admin.id, { decision: 'approved' });
    expect(approved.auditStatus).toBe('approved');
    expect(approved.auditReason).toBeNull();
  });

  it('资质列表返回数组', async () => {
    const list = await listPractitioners();
    expect(Array.isArray(list)).toBe(true);
  });
});

/* ------------------------------ BFF 路由 ------------------------------ */

function makePatientCtx(
  accountId: string | null,
  opts: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = accountId
    ? { id: accountId, name: '患者', roles: ['patient'], permissions: ['patient:account', 'patient:realname'] }
    : null;
  return {
    req: { headers: { get: () => null } } as unknown as Request,
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}
function makeStaffCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = view
    ? { id: view.id, name: view.realName, roles: view.rawRoles, permissions: view.permissions }
    : null;
  return {
    req: { headers: { get: () => null } } as unknown as Request,
    params: opts.params ?? {},
    query: new URLSearchParams(),
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}
function findRoute(method: string, path: string) {
  return internetHospitalRoutes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M3-J BFF 路由：权限与信封', () => {
  it('未登录访问就诊人列表 → 401', async () => {
    const res = await findRoute('GET', '/api/v1/internet/patient/profiles').handle(makePatientCtx(null));
    expect(res.status).toBe(401);
  });

  it('患者登录成功路径统一信封', async () => {
    const res = await findRoute('POST', '/api/v1/internet/patient/login').handle(
      makePatientCtx(null, { body: { code: 'route-' + rand() } }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).code).toBe(0);
  });

  it('药师提交资质（具备医护角色）成功', async () => {
    const res = await findRoute('POST', '/api/v1/internet/practitioner/submit').handle(
      makeStaffCtx(pharmacist, { body: { practitionerType: 'pharmacist', practiceScope: '药学' } }),
    );
    // 药师是医护角色，可提交；返回 200
    expect(res.status).toBe(200);
    const body = await res.json();
    if (body.data?.id) practitionerIds.push(body.data.id);
  });

  it('患者不能提交医护资质 → 403', async () => {
    const acc = await loginAccount('notstaff-' + rand());
    const res = await findRoute('POST', '/api/v1/internet/practitioner/submit').handle(
      makePatientCtx(acc.accountId, { body: { practitionerType: 'doctor' } }),
    );
    expect(res.status).toBe(403);
  });

  it('普通医师无资质审核权限访问列表 → 403', async () => {
    const res = await findRoute('GET', '/api/v1/internet/practitioners').handle(makeStaffCtx(doctorChen));
    expect(res.status).toBe(403);
  });

  it('管理员审核不存在资质 → 404', async () => {
    const res = await findRoute('POST', '/api/v1/internet/practitioners/:id/audit').handle(
      makeStaffCtx(admin, {
        params: { id: crypto.randomUUID() },
        body: { decision: 'approved' },
      }),
    );
    expect(res.status).toBe(404);
  });
});
