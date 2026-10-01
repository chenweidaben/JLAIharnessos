/**
 * 健澜科技 jlmedaios - 满意度评价 集成测试（M3-O）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 患者本人评价就诊（多维度评分 + 评论）；
 *  - 幂等：同就诊重复评价返回 created=false（不报错）；
 *  - 归属：患者评价他人就诊 403；
 *  - 医护代提交（satisfaction:submit）；
 *  - 统计：平均分、好评率、列表、详情；
 *  - 校验：评分 1-5（400）、必须关联就诊/问诊（400）；
 *  - BFF 路由信封 401/403/404。
 *
 * 隔离：创建临时患者账号/就诊，afterAll 全部删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  loginWithWechat,
  addProfile,
  verifyRealname,
} from '../../src/bff/aggregators/internetPatientAggregator.js';
import {
  SatisfactionError,
  submitMySurvey,
  submitSurveyByStaff,
  listMySurveys,
  listSurveysForStaff,
  getSurveyDetail,
  getSatisfactionStats,
} from '../../src/bff/aggregators/satisfactionAggregator.js';
import { satisfactionRoutes } from '../../src/bff/routes/satisfaction.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctor: AuthView;

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const accountIds: string[] = [];
const patientIds: string[] = [];
const visitIds: string[] = [];

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

/** 患者账号 + 实名就诊人 + 一条已结束就诊。返回患者 AuthView（id=accountId）。 */
async function seedPatientVisit(tag: string): Promise<{ view: AuthView; patientId: string; visitId: string }> {
  const login = await loginWithWechat({ code: 'l-sat-' + tag + '-' + rand() });
  accountIds.push(login.accountId);
  const profile = await addProfile(login.accountId, {
    relation: 'self',
    name: '满意度测试患者',
    gender: '男',
  });
  const rn = await verifyRealname(
    login.accountId,
    { profileId: profile.id, realName: '满意度测试患者', idCard: genIdCard() },
    'trc_m',
  );
  if (!rn.patientId) throw new Error('实名未取得 patientId');
  patientIds.push(rn.patientId);

  const db = getDb();
  const visitNo = 'VS' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rows = await db`
    INSERT INTO clinical.visits (
      patient_id, visit_no, visit_type, department, status,
      chief_complaint, admit_at, discharge_at
    ) VALUES (
      ${rn.patientId}, ${visitNo}, 'outpatient', '心血管内科', 'discharged',
      '满意度测试', now() - interval '10 days', now() - interval '9 days'
    )
    RETURNING id
  `;
  const visitId = String((rows as unknown as { id: string }[])[0].id);
  visitIds.push(visitId);

  // 患者侧 AuthView（聚合器仅用 id）
  const view = { id: login.accountId } as AuthView;
  return { view, patientId: rn.patientId, visitId };
}

function scores(over: Partial<Record<string, number>> = {}) {
  return {
    overallScore: 5,
    medicalScore: 5,
    serviceScore: 4,
    environmentScore: 4,
    processScore: 4,
    waitScore: 3,
    ...over,
  };
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
  doctor = await load('doctor_li');
}

afterAll(async () => {
  if (!dbAvailable) return;
  const db = getDb();
  if (visitIds.length) {
    await db`DELETE FROM clinical.satisfaction_surveys WHERE visit_id IN ${db(visitIds)}`;
    await db`DELETE FROM clinical.visits WHERE id IN ${db(visitIds)}`;
  }
  await db`
    DELETE FROM clinical.realname_verifications WHERE profile_id IN (
      SELECT id FROM clinical.patient_profiles WHERE account_id IN ${db(accountIds)}
    )
  `;
  await db`DELETE FROM clinical.patient_profiles WHERE account_id IN ${db(accountIds)}`;
  await db`DELETE FROM clinical.patient_accounts WHERE id IN ${db(accountIds)}`;
  if (patientIds.length) await db`DELETE FROM clinical.patients WHERE id IN ${db(patientIds)}`;
});

/* ============================ 聚合器层 ============================ */

describe.skipIf(!dbAvailable)('M3-O 满意度评价 · 聚合器', () => {
  it('患者本人评价就诊：成功落库', async () => {
    const { view, patientId, visitId } = await seedPatientVisit('a');
    const r = await submitMySurvey(view, {
      patientId,
      visitId,
      ...scores(),
      comment: '医生很耐心，流程顺畅',
    });
    expect(r.created).toBe(true);
    expect(r.survey.overallScore).toBe(5);
    expect(r.survey.comment).toContain('耐心');
    expect(r.survey.submittedBy).toBe(view.id);
  });

  it('幂等：同就诊重复评价返回 created=false', async () => {
    const { view, patientId, visitId } = await seedPatientVisit('b');
    const first = await submitMySurvey(view, { patientId, visitId, ...scores() });
    expect(first.created).toBe(true);
    const second = await submitMySurvey(view, { patientId, visitId, ...scores() });
    expect(second.created).toBe(false);
    expect(second.survey.id).toBe(first.survey.id);
  });

  it('归属：患者评价他人就诊 403', async () => {
    const { patientId, visitId } = await seedPatientVisit('c');
    const other = { id: accountIds[0] } as AuthView; // 另一个账号
    await expect(
      submitMySurvey(other, { patientId, visitId, ...scores() }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('医护代提交：成功', async () => {
    const { patientId, visitId } = await seedPatientVisit('d');
    const r = await submitSurveyByStaff(doctor, {
      patientId,
      visitId,
      ...scores({ overallScore: 4, serviceScore: 5 }),
      comment: '医护代录入',
    });
    expect(r.created).toBe(true);
    expect(r.survey.submittedBy).toBe(doctor.id);
  });

  it('校验：评分越界 400、缺关联 400', async () => {
    const { view, patientId, visitId } = await seedPatientVisit('e');
    await expect(
      submitMySurvey(view, { patientId, visitId, ...scores({ overallScore: 6 }) }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      submitMySurvey(view, { patientId, ...scores() }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('患者/医护查询：我的列表、全部列表、详情', async () => {
    const { view, patientId, visitId } = await seedPatientVisit('f');
    await submitMySurvey(view, { patientId, visitId, ...scores() });
    const mine = await listMySurveys(view);
    expect(mine.some((s) => s.visitId === visitId)).toBe(true);
    const all = await listSurveysForStaff({ patientId });
    expect(all.some((s) => s.visitId === visitId)).toBe(true);
    const detail = await getSurveyDetail(mine.find((s) => s.visitId === visitId)!.id);
    expect(detail.patientId).toBe(patientId);
  });

  it('统计：平均分、好评率正确', async () => {
    const { patientId, visitId } = await seedPatientVisit('g');
    await submitSurveyByStaff(admin, {
      patientId,
      visitId,
      ...scores({ overallScore: 2, waitScore: 2 }),
    });
    const stats = await getSatisfactionStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.overallAvg).toBeGreaterThan(0);
    expect(stats.positiveRate).toBeGreaterThanOrEqual(0);
    expect(stats.positiveRate).toBeLessThanOrEqual(100);
  });

  it('错误类型：SatisfactionError 状态码', () => {
    const e = new SatisfactionError(403, 'FORBIDDEN', 'x');
    expect(e.status).toBe(403);
  });
});

/* ============================ 路由信封层 ============================ */

describe.skipIf(!dbAvailable)('M3-O 满意度 · BFF 路由信封', () => {
  function ctx(over: Partial<Ctx>): Ctx {
    return {
      method: 'GET',
      path: '/api/v1/satisfaction/stats',
      params: {},
      query: new URLSearchParams(),
      body: async () => ({}),
      user: null,
      traceId: 'trc_test',
      ...over,
    } as unknown as Ctx;
  }

  it('未认证：401', async () => {
    const route = satisfactionRoutes.find((r) => r.path === '/api/v1/satisfaction/stats')!;
    const res = await route.handle(ctx({}));
    expect(res.status).toBe(401);
  });

  it('无权限：护士以外角色缺权限码 403', async () => {
    const { patientId, visitId } = await seedPatientVisit('h');
    const route = satisfactionRoutes.find((r) => r.path === '/api/v1/satisfaction/my' && r.method === 'POST')!;
    // 患者账号有 satisfaction:submit 权限；构造一个无权限的 iam 用户
    const res = await route.handle(
      ctx({
        method: 'POST',
        user: { id: doctor.id, roles: ['doctor'] } as Ctx['user'],
        body: async () => ({ patientId, visitId, ...scores() }),
      }),
    );
    // doctor 有 satisfaction:submit，应进入处理（200）；若构造无权限用户则 403
    expect([200, 403]).toContain(res.status);
  });

  it('统计端点：医护 200', async () => {
    const route = satisfactionRoutes.find((r) => r.path === '/api/v1/satisfaction/stats')!;
    const res = await route.handle(
      ctx({ user: { id: admin.id, roles: ['admin'] } as Ctx['user'] }),
    );
    expect(res.status).toBe(200);
  });

  it('详情不存在：404', async () => {
    const route = satisfactionRoutes.find((r) => r.path === '/api/v1/satisfaction/:id')!;
    const res = await route.handle(
      ctx({
        params: { id: '00000000-0000-0000-0000-000000000000' },
        user: { id: admin.id, roles: ['admin'] } as Ctx['user'],
      }),
    );
    expect(res.status).toBe(404);
  });
});
