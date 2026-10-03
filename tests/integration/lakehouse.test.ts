/* ============================================================================
 * 健澜科技杠OS - 数据湖仓 集成测试（M5-D）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 全量 pipeline：DWD/DWS/ADS 全量加工，返回作业行数；
 *  - 增量 pipeline：无变化时读 0；更新一条源记录后正确捕获并传播；
 *  - 单作业重跑：DWS/ADS 全量重算；
 *  - 数据一致性：DWD 就诊总数 = ADS 总就诊量；
 *  - 血缘、运行历史查询；
 *  - 权限：doctor 可查询（read）不可加工（admin）；pharmacist 无权限；
 *  - BFF 路由信封 401/403/400。
 *
 * 加工只读源表、写分层表（dwd/dws/ads/meta），结果可重复、不污染临床库。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { afterAll, describe, expect, it } from 'bun:test';

import { verifyDbConnection, getDb } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import {
  LakehouseAggregatorError,
  getDeptSummary,
  getHospitalMetrics,
  listJobRuns,
  listLineage,
  triggerJob,
  triggerPipeline,
} from '../../src/bff/aggregators/lakehouseAggregator.js';
import { dataWarehouseRoutes } from '../../src/bff/routes/dataWarehouse.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctor: AuthView;
let pharmacist: AuthView;

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
}

afterAll(async () => {
  if (!dbAvailable) return;
  // 恢复测试中被更新的 visit（见增量捕获用例）
});

if (!dbAvailable) {
  describe('数据湖仓 集成测试（数据库不可用，跳过）', () => {
    it('skip', () => expect(true).toBe(true));
  });
} else {
  describe('数据湖仓全闭环', () => {
    it('全量 pipeline：4 作业全部成功，返回行数', async () => {
      const summary = await triggerPipeline(admin, 'full');
      expect(summary.mode).toBe('full');
      expect(summary.jobs).toHaveLength(4);
      const byCode = Object.fromEntries(
        summary.jobs.map((j) => [j.jobCode, j]),
      );
      expect(byCode.dwd_visit.rowsWritten).toBeGreaterThan(0);
      expect(byCode.dws_dept_daily.rowsWritten).toBeGreaterThan(0);
      expect(byCode.ads_hospital_daily.rowsWritten).toBeGreaterThan(0);
    });

    it('数据一致性：DWD 就诊总数 = ADS 总就诊量', async () => {
      const db = getDb();
      const dwdRows = (await db`
        SELECT count(*) AS c FROM dwd.visit_detail
      `) as Record<string, unknown>[];
      const adsRows = (await db`
        SELECT coalesce(sum(total_visits), 0) AS c FROM ads.hospital_daily_metrics
      `) as Record<string, unknown>[];
      expect(Number(dwdRows[0].c)).toBe(Number(adsRows[0].c));
    });

    it('增量 pipeline：无变化时所有作业读 0', async () => {
      const summary = await triggerPipeline(admin, 'incremental');
      for (const j of summary.jobs) {
        expect(j.rowsRead).toBe(0);
      }
    });

    it('更新一条源记录后，增量正确捕获并传播到 DWS/ADS', async () => {
      const db = getDb();
      const target = (await db`
        SELECT id, coalesce(admit_at, created_at)::date AS d
        FROM clinical.visits
        WHERE visit_type='outpatient'
        ORDER BY created_at DESC LIMIT 1
      `) as Record<string, unknown>[];
      const vid = String(target[0].id);
      await db`
        UPDATE clinical.visits
        SET chief_complaint = 'lakehouse-it-inc', updated_at = now()
        WHERE id = ${vid}
      `;
      const summary = await triggerPipeline(admin, 'incremental');
      const byCode = Object.fromEntries(summary.jobs.map((j) => [j.jobCode, j]));
      expect(byCode.dwd_visit.rowsRead).toBe(1);
      expect(byCode.dws_dept_daily.rowsWritten).toBeGreaterThan(0);
      expect(byCode.ads_hospital_daily.rowsWritten).toBe(1);
      // watermark 推进后，再次增量读 0
      const again = await triggerPipeline(admin, 'incremental');
      expect(again.jobs[0].rowsRead).toBe(0);
      // 恢复 chief_complaint
      await db`
        UPDATE clinical.visits
        SET chief_complaint = NULL, updated_at = now()
        WHERE id = ${vid}
      `;
    });

    it('单作业重跑：DWS 全量重算成功', async () => {
      const summary = await triggerJob(admin, 'dws_dept_daily');
      expect(summary.jobs[0].jobCode).toBe('dws_dept_daily');
      expect(summary.jobs[0].rowsWritten).toBeGreaterThan(0);
    });

    it('单作业重跑：ADS 全量重算成功', async () => {
      const summary = await triggerJob(admin, 'ads_hospital_daily');
      expect(summary.jobs[0].jobCode).toBe('ads_hospital_daily');
      expect(summary.jobs[0].rowsWritten).toBeGreaterThan(0);
    });

    it('血缘查询：返回至少 4 条加工血缘', async () => {
      const lineage = await listLineage(admin);
      expect(lineage.length).toBeGreaterThanOrEqual(4);
      for (const l of lineage) {
        expect(l.sourceTable).toContain('.');
        expect(l.targetTable).toContain('.');
      }
    });

    it('运行历史查询：返回最近的成功运行', async () => {
      const runs = await listJobRuns(admin, { limit: 10 });
      expect(runs.length).toBeGreaterThan(0);
      expect(runs.some((r) => r.status === 'success')).toBe(true);
    });

    it('院级指标查询：返回按日期倒序的指标', async () => {
      const metrics = await getHospitalMetrics(admin);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].statDate >= metrics[metrics.length - 1].statDate).toBe(true);
    });

    it('科室汇总查询：可按日期过滤', async () => {
      const metrics = await getHospitalMetrics(admin, { limit: 1 });
      const date = metrics[0].statDate;
      const summary = await getDeptSummary(admin, { date });
      expect(summary.length).toBeGreaterThan(0);
      for (const s of summary) expect(s.statDate).toBe(date);
    });

    it('非法 mode → 400', async () => {
      await expect(
        triggerPipeline(admin, 'invalid' as never),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('非法 jobCode → 400', async () => {
      await expect(
        triggerJob(admin, 'unknown_job' as never),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('错误类型为 LakehouseAggregatorError', async () => {
      let caught: unknown = null;
      try {
        await triggerPipeline(admin, 'bad' as never);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(LakehouseAggregatorError);
    });

    it('BFF 路由：doctor 可查询指标（read）', async () => {
      const route = dataWarehouseRoutes.find(
        (r) => r.method === 'GET' && r.path === '/api/v1/data-warehouse/metrics',
      )!;
      const res = await route.handle({
        user: { id: doctor.id, roles: doctor.rawRoles, permissions: doctor.permissions },
        query: new URLSearchParams(),
        params: {},
      } as unknown as Ctx);
      expect(res.status).toBe(200);
    });

    it('BFF 路由：doctor 不可触发加工（无 admin）→ 403', async () => {
      const route = dataWarehouseRoutes.find(
        (r) => r.method === 'POST' && r.path === '/api/v1/data-warehouse/pipeline',
      )!;
      const res = await route.handle({
        user: { id: doctor.id, roles: doctor.rawRoles },
        params: {},
        body: async () => ({ mode: 'incremental' }),
      } as unknown as Ctx);
      expect(res.status).toBe(403);
    });

    it('BFF 路由：pharmacist 无 data_warehouse 权限 → 403', async () => {
      const route = dataWarehouseRoutes.find(
        (r) => r.method === 'GET' && r.path === '/api/v1/data-warehouse/metrics',
      )!;
      const res = await route.handle({
        user: { id: pharmacist.id, roles: pharmacist.rawRoles },
        query: new URLSearchParams(),
        params: {},
      } as unknown as Ctx);
      expect(res.status).toBe(403);
    });

    it('BFF 路由：未认证 → 401', async () => {
      const route = dataWarehouseRoutes.find(
        (r) => r.method === 'GET' && r.path === '/api/v1/data-warehouse/metrics',
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
