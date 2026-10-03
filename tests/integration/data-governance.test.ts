/* ============================================================================
 * 健澜科技杠OS - 数据治理 集成测试（M5-E）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 质量检测：五维规则对真实表检测，返回评分与逐规则结果；
 *  - 查询：最新运行、评分趋势、检测结果、规则清单；
 *  - 隐私分级：自动扫描列、台账查询、人工修正（留痕，不被自动覆盖）；
 *  - 错误：非法分级 400、目标列不存在 404；
 *  - 权限：doctor 可查询（read）不可检测（admin）；pharmacist 无权限；
 *    未认证 401。
 *
 * 检测只读业务表，结果/分级写 meta 层，可重复、不污染临床库。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { afterAll, describe, expect, it } from 'bun:test';

import { getDb, verifyDbConnection } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import {
  DataGovernanceError,
  getLatestRun,
  getQualityTrend,
  getRunResults,
  listClassification,
  listRules,
  overrideClassification,
  runQualityCheck,
  scanClassification,
} from '../../src/bff/aggregators/dataGovernanceAggregator.js';
import { dataGovernanceRoutes } from '../../src/bff/routes/dataGovernance.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctor: AuthView;
let pharmacist: AuthView;
let baselineRunIds = new Set<string>();

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
  pharmacist = await load('pharmacist_wang');
  // 记录测试前已存在的检测运行，afterAll 时只清理本测试新增的
  const existing = await getDb()`SELECT run_id FROM meta.dq_runs`;
  baselineRunIds = new Set(
    (existing as Record<string, unknown>[]).map((r) => String(r.run_id)),
  );
}

afterAll(async () => {
  if (!dbAvailable) return;
  const db = getDb();
  // 1. 清理本测试新增的检测运行（及其逐规则结果）
  const current = await db`SELECT run_id FROM meta.dq_runs`;
  const newIds = (current as Record<string, unknown>[])
    .map((r) => String(r.run_id))
    .filter((id) => !baselineRunIds.has(id));
  if (newIds.length) {
    await db`DELETE FROM meta.dq_results WHERE run_id IN ${db(newIds)}`;
    await db`DELETE FROM meta.dq_runs WHERE run_id IN ${db(newIds)}`;
  }
  // 2. 恢复 blood_type：删除测试写入的 manual 记录后重新扫描回到 auto
  await db`
    DELETE FROM meta.field_classification
    WHERE schema_name = 'clinical' AND table_name = 'patients'
      AND column_name = 'blood_type' AND source = 'manual'
  `;
  await scanClassification(admin);
});

if (!dbAvailable) {
  describe('数据治理 集成测试（数据库不可用，跳过）', () => {
    it('skip', () => expect(true).toBe(true));
  });
} else {
  describe('数据治理全闭环', () => {
    it('质量检测：对全部启用规则执行，返回评分与结果', async () => {
      const summary = await runQualityCheck(admin);
      expect(summary.status).toBe('success');
      expect(summary.totalRules).toBe(15);
      expect(summary.results.length).toBe(15);
      expect(summary.score).toBeGreaterThanOrEqual(0);
      expect(summary.score).toBeLessThanOrEqual(100);
      expect(
        summary.passedRules + summary.failedRules,
      ).toBe(summary.totalRules);
    });

    it('每个规则结果含通过/失败统计且通过率合法', async () => {
      const { run, results } = await getRunResults(admin);
      expect(run).toBeTruthy();
      expect(results.length).toBe(15);
      for (const r of results) {
        expect(r.passedRows + r.failedRows).toBe(r.totalRows);
        expect(r.passRate).toBeGreaterThanOrEqual(0);
        expect(r.passRate).toBeLessThanOrEqual(100);
        expect(['pass', 'fail']).toContain(r.status);
        // JOIN dq_rules 回填的展示字段必须真实存在（非 undefined/空 target）
        expect(r.ruleName).toBeTruthy();
        expect(r.ruleName).not.toBe(r.ruleCode);
        expect(['completeness', 'uniqueness', 'validity', 'consistency', 'timeliness']).toContain(
          r.dimension,
        );
        expect(['critical', 'major', 'minor']).toContain(r.severity);
        expect(r.target).toContain('.');
        expect(r.target).not.toBe('.');
      }
    });

    it('最新运行：与刚触发的检测一致', async () => {
      const latest = await getLatestRun(admin);
      expect(latest).not.toBeNull();
      expect(latest!.totalRules).toBe(15);
      expect(latest!.status).toBe('success');
    });

    it('评分趋势：返回成功运行序列（时间升序）', async () => {
      const trend = await getQualityTrend(admin, 10);
      expect(trend.length).toBeGreaterThan(0);
      for (let i = 1; i < trend.length; i++) {
        expect(
          new Date(trend[i].startedAt).getTime() >=
            new Date(trend[i - 1].startedAt).getTime(),
        ).toBe(true);
      }
    });

    it('规则清单：15 条规则，五维覆盖', async () => {
      const rules = await listRules(admin);
      expect(rules.length).toBe(15);
      const dimensions = new Set(rules.map((r) => r.dimension));
      expect(dimensions.has('completeness')).toBe(true);
      expect(dimensions.has('uniqueness')).toBe(true);
      expect(dimensions.has('validity')).toBe(true);
      expect(dimensions.has('consistency')).toBe(true);
      expect(dimensions.has('timeliness')).toBe(true);
    });

    it('隐私分级：自动扫描列并建立台账', async () => {
      const result = await scanClassification(admin);
      expect(result.scanned).toBeGreaterThan(0);
      expect(result.classified).toBeGreaterThan(0);
      const list = await listClassification(admin, {});
      expect(list.length).toBeGreaterThan(0);
    });

    it('隐私分级：身份证列应判为 L4（机密）', async () => {
      const list = await listClassification(admin, { schema: 'clinical' });
      const idCard = list.find(
        (c) => c.tableName === 'patients' && c.columnName === 'id_card_hash',
      );
      expect(idCard).toBeTruthy();
      expect(idCard!.level).toBe(4);
    });

    it('人工修正：将列改为 L2 并留痕', async () => {
      const result = await overrideClassification(admin, {
        schemaName: 'clinical',
        tableName: 'patients',
        columnName: 'blood_type',
        level: 2,
        reason: '集成测试：血型按内部管理',
      });
      expect(result.level).toBe(2);
      expect(result.source).toBe('manual');
      expect(result.overriddenByName).toBe(admin.realName);
    });

    it('人工修正不被自动扫描覆盖', async () => {
      await scanClassification(admin);
      const list = await listClassification(admin, { schema: 'clinical' });
      const bloodType = list.find(
        (c) => c.tableName === 'patients' && c.columnName === 'blood_type',
      );
      expect(bloodType).toBeTruthy();
      expect(bloodType!.level).toBe(2);
      expect(bloodType!.source).toBe('manual');
    });

    it('非法分级（0）→ 400', async () => {
      await expect(
        overrideClassification(admin, {
          schemaName: 'clinical',
          tableName: 'patients',
          columnName: 'blood_type',
          level: 0,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('非法分级（5）→ 400', async () => {
      await expect(
        overrideClassification(admin, {
          schemaName: 'clinical',
          tableName: 'patients',
          columnName: 'blood_type',
          level: 5,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('目标列不存在 → 404', async () => {
      await expect(
        overrideClassification(admin, {
          schemaName: 'clinical',
          tableName: 'patients',
          columnName: 'no_such_column',
          level: 2,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('错误类型为 DataGovernanceError', async () => {
      let caught: unknown = null;
      try {
        await overrideClassification(admin, {
          schemaName: 'clinical',
          tableName: 'patients',
          columnName: 'blood_type',
          level: 9,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(DataGovernanceError);
    });

    it('BFF 路由：doctor 可查询最新评分（read）', async () => {
      const route = dataGovernanceRoutes.find(
        (r) =>
          r.method === 'GET' &&
          r.path === '/api/v1/data-governance/quality/latest',
      )!;
      const res = await route.handle({
        user: {
          id: doctor.id,
          roles: doctor.rawRoles,
          permissions: doctor.permissions,
        },
        query: new URLSearchParams(),
        params: {},
      } as unknown as Ctx);
      expect(res.status).toBe(200);
    });

    it('BFF 路由：doctor 不可触发检测（无 admin）→ 403', async () => {
      const route = dataGovernanceRoutes.find(
        (r) =>
          r.method === 'POST' &&
          r.path === '/api/v1/data-governance/quality/run',
      )!;
      const res = await route.handle({
        user: { id: doctor.id, roles: doctor.rawRoles },
        params: {},
        body: async () => ({}),
      } as unknown as Ctx);
      expect(res.status).toBe(403);
    });

    it('BFF 路由：pharmacist 无 data_governance 权限 → 403', async () => {
      const route = dataGovernanceRoutes.find(
        (r) =>
          r.method === 'GET' &&
          r.path === '/api/v1/data-governance/quality/latest',
      )!;
      const res = await route.handle({
        user: { id: pharmacist.id, roles: pharmacist.rawRoles },
        query: new URLSearchParams(),
        params: {},
      } as unknown as Ctx);
      expect(res.status).toBe(403);
    });

    it('BFF 路由：未认证 → 401', async () => {
      const route = dataGovernanceRoutes.find(
        (r) =>
          r.method === 'GET' &&
          r.path === '/api/v1/data-governance/quality/latest',
      )!;
      const res = await route.handle({
        user: null,
        query: new URLSearchParams(),
        params: {},
      } as unknown as Ctx);
      expect(res.status).toBe(401);
    });
  });
}
