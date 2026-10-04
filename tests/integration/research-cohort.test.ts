/**
 * 健澜科技 jlmedaios - 科研专病队列 集成测试（M5-B）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock），覆盖：
 *  - 创建队列（草稿）→ 发布 → 运行匹配，符合患者自动入组；
 *  - 重复运行不重复入组；
 *  - 成员/统计/脱敏数据集导出（无明文身份）；
 *  - 归档；
 *  - 状态机非法转换（草稿运行/已归档发布/编辑已发布）→ 409；
 *  - 详情 404；
 *  - BFF 路由信封 401/403。
 *
 * 隔离：记录全部 cohort/patient/visit，afterAll 精确删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { getDb, verifyDbConnection } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createDiagnosis } from '../../src/db/repositories/diagnosisRepo.js';
import { createLabResult } from '../../src/db/repositories/labResultRepo.js';
import {
  ResearchError,
  archiveResearchCohort,
  createResearchCohort,
  getCohortMembers,
  getResearchCohort,
  getResearchCohortStats,
  exportCohortDataset,
  publishResearchCohort,
  runCohortMatching,
  updateResearchCohort,
} from '../../src/bff/aggregators/researchAggregator.js';
import { researchRoutes } from '../../src/bff/routes/research.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let pharmacist: AuthView;

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cohortIds: string[] = [];
const patientIds: string[] = [];
const visitIds: string[] = [];

// 唯一疾病/标签，确保只匹配本测试患者
const DISEASE = `M5B测试糖尿病${runId}`;
const TAG = `M5B_TAG_${runId}`;
const EXCLUDE_TAG = `M5B_EXCL_${runId}`;

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
}

/** 创建测试患者 + 就诊 + 诊断（+检验） */
async function seedPatient(opts: {
  age: number;
  gender: '男' | '女';
  withDiagnosis?: boolean;
  withHighGlucose?: boolean;
  withExcludeTag?: boolean;
}): Promise<{ patientId: string; visitId: string }> {
  const birthYear = 2026 - opts.age;
  const patient = await createPatient({
    mrn: `M5B${runId.slice(-4)}${patientIds.length}`,
    nameMasked: `M5B患者${patientIds.length}**`,
    gender: opts.gender,
    birthDate: `${birthYear}-06-15`,
    tags: [
      TAG,
      ...(opts.withExcludeTag ? [EXCLUDE_TAG] : []),
    ],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'outpatient',
    department: '内分泌科',
    chiefComplaint: '体检发现血糖升高',
  });
  visitIds.push(visit.id);
  if (opts.withDiagnosis) {
    await createDiagnosis({
      visitId: visit.id,
      patientId: patient.id,
      code: 'E11',
      name: DISEASE,
      confirmed: true,
    });
  }
  if (opts.withHighGlucose) {
    await createLabResult({
      visitId: visit.id,
      patientId: patient.id,
      itemCode: 'GLU',
      itemName: '空腹血糖',
      numericValue: 8.5,
      unit: 'mmol/L',
      abnormalFlag: 'H',
    });
  }
  return { patientId: patient.id, visitId: visit.id };
}

afterAll(async () => {
  if (!dbAvailable) return;
  const db = getDb();
  if (cohortIds.length > 0) {
    await db`DELETE FROM clinical.research_cohorts WHERE id = ANY(${cohortIds})`;
  }
  if (patientIds.length > 0) {
    await db`DELETE FROM clinical.lab_results WHERE patient_id = ANY(${patientIds})`;
    await db`DELETE FROM clinical.diagnoses WHERE patient_id = ANY(${patientIds})`;
    await db`DELETE FROM clinical.visits WHERE id = ANY(${visitIds})`;
    await db`DELETE FROM clinical.patients WHERE id = ANY(${patientIds})`;
  }
});

describe('M5-B 科研专病队列（真实 PostgreSQL）', () => {
  if (!dbAvailable) {
    it.skip('数据库不可用，跳过（不冒充通过）', () => {});
    return;
  }

  let matchingCohortId = '';

  it('准备测试患者：符合 / 年龄不符 / 排除标签', async () => {
    // 符合：55 岁、男、诊断 + 高血糖
    await seedPatient({
      age: 55,
      gender: '男',
      withDiagnosis: true,
      withHighGlucose: true,
    });
    // 年龄不符：30 岁
    await seedPatient({
      age: 30,
      gender: '男',
      withDiagnosis: true,
      withHighGlucose: true,
    });
    // 符合纳入但带排除标签
    await seedPatient({
      age: 55,
      gender: '男',
      withDiagnosis: true,
      withHighGlucose: true,
      withExcludeTag: true,
    });
    expect(patientIds).toHaveLength(3);
  });

  it('创建队列（草稿）成功', async () => {
    const cohort = await createResearchCohort(admin, {
      name: `M5B队列${runId}`,
      disease: DISEASE,
      diseaseCode: 'E11',
      criteria: {
        include: {
          minAge: 40,
          maxAge: 75,
          gender: '男',
          diagnoses: [DISEASE],
          tags: [TAG],
          labs: [{ itemCode: 'GLU', op: 'gt', value: 7 }],
        },
        exclude: {
          tags: [EXCLUDE_TAG],
        },
      },
    });
    cohortIds.push(cohort.id);
    matchingCohortId = cohort.id;
    expect(cohort.status).toBe('draft');
  });

  it('创建队列缺名称 → 400', async () => {
    await expect(
      createResearchCohort(admin, {
        name: '',
        disease: 'x',
        criteria: { include: {}, exclude: {} },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('草稿态运行匹配 → 409', async () => {
    await expect(
      runCohortMatching(admin, matchingCohortId),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('发布队列（draft→active）', async () => {
    const cohort = await publishResearchCohort(admin, matchingCohortId);
    expect(cohort.status).toBe('active');
  });

  it('重复发布 → 409', async () => {
    await expect(
      publishResearchCohort(admin, matchingCohortId),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('编辑已发布队列 → 409', async () => {
    await expect(
      updateResearchCohort(admin, matchingCohortId, { name: '改名' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('运行匹配：仅符合患者入组（1 人）', async () => {
    const result = await runCohortMatching(admin, matchingCohortId);
    const members = await getCohortMembers(admin, matchingCohortId);
    const testMembers = members.filter((m) => patientIds.includes(m.patientId));
    expect(testMembers).toHaveLength(1);
    expect(testMembers[0].patientId).toBe(patientIds[0]);
    // 命中规则非空
    expect(testMembers[0].matchedRules.length).toBeGreaterThan(0);
    expect(result.totalMembers).toBe(members.length);
  }, { timeout: 15000 });

  it('重复运行不重复入组（新增 0）', async () => {
    const result = await runCohortMatching(admin, matchingCohortId);
    expect(result.added).toBe(0);
    const members = await getCohortMembers(admin, matchingCohortId);
    const testMembers = members.filter((m) => patientIds.includes(m.patientId));
    expect(testMembers).toHaveLength(1);
  }, { timeout: 15000 });

  it('成员快照脱敏：不含明文姓名/电话/身份证', async () => {
    const members = await getCohortMembers(admin, matchingCohortId);
    const testMember = members.find((m) => m.patientId === patientIds[0])!;
    const snap = testMember.dataSnapshot;
    expect(snap.name).toBeUndefined();
    expect(snap.nameEnc).toBeUndefined();
    expect(snap.phoneEnc).toBeUndefined();
    expect(snap.idCardHash).toBeUndefined();
    // 含基础研究字段
    expect(snap.age).toBe(55);
    expect(snap.gender).toBe('男');
  });

  it('队列统计：总数、性别、年龄段', async () => {
    const stats = await getResearchCohortStats(admin, matchingCohortId);
    expect(stats.total).toBeGreaterThanOrEqual(1);
    // 测试成员为男性、55 岁落在 40-59
    expect(stats.byGender['男']).toBeGreaterThanOrEqual(1);
    expect(stats.ageBuckets['40-59']).toBeGreaterThanOrEqual(1);
  });

  it('导出脱敏数据集：无明文身份字段', async () => {
    const rows = await exportCohortDataset(admin, matchingCohortId);
    const testRows = rows.filter((r) => patientIds.includes(String(r.patientId) ?? ''));
    // 快照本身不含 patientId 明文（snapshot 无 patientId），逐行检查无身份字段
    for (const row of rows) {
      expect(row.name).toBeUndefined();
      expect(row.nameEnc).toBeUndefined();
      expect(row.phoneEnc).toBeUndefined();
      expect(row.idCardHash).toBeUndefined();
    }
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('归档队列（active→archived）', async () => {
    const cohort = await archiveResearchCohort(admin, matchingCohortId);
    expect(cohort.status).toBe('archived');
  });

  it('已归档再运行匹配 → 409', async () => {
    await expect(
      runCohortMatching(admin, matchingCohortId),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('重复归档 → 409', async () => {
    await expect(
      archiveResearchCohort(admin, matchingCohortId),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('详情查询：不存在 → 404', async () => {
    await expect(
      getResearchCohort(admin, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('错误类型为 ResearchError', async () => {
    let caught: unknown = null;
    try {
      await getResearchCohort(admin, '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ResearchError);
  });

  it('BFF 路由信封：未认证 → 401', async () => {
    const route = researchRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/research/cohorts',
    )!;
    const res = await route.handle({
      user: null,
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(401);
  });

  it('BFF 路由：药师无 research:write → 403', async () => {
    const route = researchRoutes.find(
      (r) => r.method === 'POST' && r.path === '/api/v1/research/cohorts',
    )!;
    const res = await route.handle({
      user: { id: pharmacist.id, roles: pharmacist.rawRoles },
      params: {},
      body: async () => ({
        name: 'x',
        disease: 'x',
        criteria: { include: {}, exclude: {} },
      }),
    } as unknown as Ctx);
    expect(res.status).toBe(403);
  });
});
