/**
 * 健澜科技 jlmedaios - M147-C 三级公立医院绩效考核（国考）BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/kpi?period=2026&prevPeriod=2025
 *  - auth: true + requireRole('admin')；本端点只读、无写副作用；
 *  - 从 medmuse.hospital_kpi 拉本期实际观测，交纯函数 calculateHospitalKPI
 *    归并为 4 维 20 项指标结果（红黄绿三色）；
 *  - 可选 prevPeriod：跨期趋势对比（compareKpiTrend，方向归一后判断向好/向差）；
 *  - 无真实样本时打 demo 标记，前端三态，绝不用假数据冒充真实国考结论。
 *
 * 【知识图谱与患者教育】：返回的 conclusion 话术可直接用于患者健康教育与院长汇报。
 *
 * 生产安全加固：仅 admin 可读；只返回聚合统计量，不暴露患者个体 PII；
 * hospitalId 由租户上下文透传，多租户隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  calculateHospitalKPI,
  compareKpiTrend,
  summarizeKpi,
  type KpiObservations,
  type KpiResult,
} from '../aggregators/hospitalKpiAggregator';
import { tenantService } from '@/tenant';

/** 演示模式开关：与 adminHealth / wisdomDashboard 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 取当前医院 ID（租户上下文；取不到回退 'default'，不抛错） */
function currentHospitalId(): string {
  try {
    const tid = tenantService.getDefaultTenantId();
    if (tid) return tid;
  } catch {
    // 租户上下文不可用时回退默认值，不影响端点 200
  }
  return 'default';
}

/** 演示模式观测值（确定性样本，覆盖三色：达标/待改进/未改进各有代表） */
function demoObservations(): KpiObservations {
  return {
    C1: 3.5,  // higher -> 达标
    C2: 16.2, // higher -> 待改进(0.9)
    C3: 0.18, // lower  -> 达标
    C4: 33.5, // higher -> 待改进
    C5: 58,   // higher -> 达标
    C6: 44,   // lower  -> 未达标(40/44=0.91 黄)
    C7: 7.6,  // lower  -> 达标
    C8: 1.7,  // lower  -> 待改进(1.5/1.7=0.88 红)
    C9: 4.2,  // lower  -> 达标
    C10: 6.1, // lower  -> 未达标(5/6.1=0.82)
    C11: 38,  // lower  -> 达标
    C12: 42,  // higher -> 达标
    C13: 1.1, // higher -> 待改进
    C14: 7.2, // higher -> 待改进
    C15: 30,  // higher -> 未达标
    C16: 22,  // higher -> 达标
    C17: 96,  // higher -> 达标
    C18: 23,  // higher -> 待改进
    C19: 92,  // higher -> 达标
    C20: 76,  // higher -> 待改进
  };
}

/** 演示模式上一年观测（略差于本期，用于趋势展示「稳中向好」） */
function demoPrevObservations(): KpiObservations {
  return {
    C1: 3.3, C2: 14.5, C3: 0.22, C4: 31.0, C5: 54, C6: 47,
    C7: 8.2, C8: 1.9, C9: 5.6, C10: 6.8, C11: 41, C12: 39,
    C13: 1.0, C14: 6.8, C15: 22, C16: 18, C17: 93, C18: 21,
    C19: 89, C20: 73,
  };
}

/** 从 DB 行归一为观测映射 { kpi_code: actual_value } */
function rowsToObservations(rows: Array<Record<string, unknown>>): KpiObservations {
  const obs: KpiObservations = {};
  for (const r of rows) {
    const code = String(r.kpiCode ?? '');
    const actual = Number(r.actualValue ?? NaN);
    if (/^C\d{1,2}$/.test(code) && Number.isFinite(actual)) {
      obs[code] = actual;
    }
  }
  return obs;
}

/**
 * GET /api/v1/admin/kpi
 * 三级公立医院绩效考核（国考）看板（管理驾驶舱，仅 admin）。
 * query: period（周期标签，默认当前年）/ prevPeriod（可选，用于趋势对比）
 */
async function handleHospitalKpi(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const hospitalId = currentHospitalId();
    const nowYear = new Date().getFullYear().toString();
    const period = (c.query.get('period') ?? nowYear).trim() || nowYear;
    const prevPeriodRaw = (c.query.get('prevPeriod') ?? '').trim();

    const demoMode = demoModeEnabled();

    // 本期观测：演示模式直接给确定性样本；否则查库
    let currentObs: KpiObservations;
    let usingDemo: boolean;
    if (demoMode) {
      currentObs = demoObservations();
      usingDemo = true;
    } else {
      const db = getDb();
      const dbRows = (await db`
        SELECT kpi_code AS "kpiCode", actual_value AS "actualValue"
        FROM medmuse.hospital_kpi
        WHERE hospital_id = ${hospitalId} AND period = ${period}
      `) as unknown as Array<Record<string, unknown>>;
      currentObs = rowsToObservations(dbRows);
      usingDemo = Object.keys(currentObs).length === 0;
      if (usingDemo) currentObs = demoObservations();
    }

    const results: KpiResult[] = calculateHospitalKPI(period, currentObs);
    const summary = summarizeKpi(results);

    // 跨期趋势（可选）：演示模式给上一期样本；否则查库
    let trend: ReturnType<typeof compareKpiTrend> | null = null;
    if (prevPeriodRaw) {
      let prevObs: KpiObservations;
      if (demoMode) {
        prevObs = demoPrevObservations();
      } else {
        const db = getDb();
        const prevRows = (await db`
          SELECT kpi_code AS "kpiCode", actual_value AS "actualValue"
          FROM medmuse.hospital_kpi
          WHERE hospital_id = ${hospitalId} AND period = ${prevPeriodRaw}
        `) as unknown as Array<Record<string, unknown>>;
        prevObs = rowsToObservations(prevRows);
      }
      const prevResults = calculateHospitalKPI(prevPeriodRaw, prevObs);
      trend = compareKpiTrend(prevResults, results);
    }

    return json(
      ok(
        {
          hospitalId,
          period,
          prevPeriod: prevPeriodRaw || null,
          results,
          summary,
          trend,
          demo: usingDemo,
        },
        'ok',
        c.traceId,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '国考指标计算失败';
    console.error(`[hospitalKpi] GET / [${c.traceId}]`, err);
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const hospitalKpiRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/kpi',
    auth: true,
    handle: handleHospitalKpi,
  },
];
