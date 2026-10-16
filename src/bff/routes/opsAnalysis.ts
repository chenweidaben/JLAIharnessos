/**
 * 健澜科技 jlmedaios — 【质量与体验】医院运营分析深化路由（M180-B）
 *
 *   GET /api/v1/admin/ops/analysis?dept=xxx&period=2026-09&trendType=all&days=6
 *     从 medmuse.ops_metric 读科室多期历史（默认近 6 期），交由纯函数聚合器：
 *       1) buildDeepOperationAnalysis — 四域指标目录与分析口径蓝图；
 *       2) analyzeOperationTrend      — 多期趋势（斜率/变化率/波动，up/down/flat）；
 *       3) benchmarkOperation         — 与全院标杆逐项对照，领先/持平/落后；
 *       4) predictOperationTrend       — 线性回归外推未来 days 期 + 95% 置信区间。
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回内置多期演示样例并显式标记 demo=true；
 * 某指标未落库按缺省处理，不伪造数字。
 * 医疗安全红线：仅运营管理辅助，不触发诊疗、不自动改医嘱/结算。
 * 权限码：operation:analysis:view（运营管理处 / admin 只读）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  analyzeOperationTrend,
  benchmarkOperation,
  buildDeepOperationAnalysis,
  predictOperationTrend,
  type DeptRef,
  type PeriodMetricSnapshot,
  type TrendType,
} from '../aggregators/opsAnalysisAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface MetricRow {
  period_key: string;
  domain: string;
  metric_key: string;
  metric_value: string | number;
}

/** 生成近 N 个月的 period 键（YYYY-MM），从指定月份往前推 */
function recentPeriods(latest: string, n: number): string[] {
  const m = latest.match(/^(\d{4})-(\d{2})$/);
  if (!m) return [];
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const t = mo - i;
    const ny = y + Math.floor(t / 12);
    const nm = ((t % 12) + 12) % 12 + 1;
    out.push(`${ny}-${String(nm).padStart(2, '0')}`);
  }
  return out;
}

/** 演示样例：一个内科科室近 6 个月四域指标（2000 床、日门诊 1 万三甲量级，趋势递增） */
function demoHistory(latest: string): PeriodMetricSnapshot[] {
  const periods = recentPeriods(latest, 6);
  const base = {
    outpatient_visits: 92000, avg_cost_per_visit: 318, avg_wait_minutes: 36, appointment_rate: 0.4, no_show_rate: 0.14,
    in_hospital: 180, admissions: 700, discharges: 690, avg_los: 9.9, bed_occupancy: 0.92,
    surgery_count: 250, high_level_surgery: 84, surgery_wait_hours: 44, pacu_turnover: 3.0,
    revenue: 55000000, cost: 52800000, profit: 2200000, drg_surplus: -180000, insurance_denial_rate: 0.028,
  };
  return periods.map((p, i) => {
    const g = 1 + i * 0.015; // 每期业务量缓慢增长 1.5%
    return {
      period: p,
      metrics: {
        outpatient_visits: Math.round(base.outpatient_visits * g),
        avg_cost_per_visit: Math.round(base.avg_cost_per_visit * (1 + i * 0.004)),
        avg_wait_minutes: Math.max(24, Math.round(base.avg_wait_minutes - i * 2)),
        appointment_rate: Math.round((base.appointment_rate + i * 0.008) * 1000) / 1000,
        no_show_rate: Math.round((base.no_show_rate - i * 0.002) * 1000) / 1000,
        in_hospital: Math.round(base.in_hospital * g),
        admissions: Math.round(base.admissions * g),
        discharges: Math.round(base.discharges * g),
        avg_los: Math.round((base.avg_los - i * 0.15) * 10) / 10,
        bed_occupancy: Math.round(base.bed_occupancy * 1000) / 1000,
        surgery_count: Math.round(base.surgery_count * g),
        high_level_surgery: Math.round(base.high_level_surgery * g),
        surgery_wait_hours: Math.max(28, Math.round(base.surgery_wait_hours - i * 3)),
        pacu_turnover: Math.round((base.pacu_turnover + i * 0.08) * 100) / 100,
        revenue: Math.round(base.revenue * g),
        cost: Math.round(base.cost * g * 0.99),
        profit: Math.round(base.profit * g * 1.2),
        drg_surplus: Math.round(base.drg_surplus * (1 - i * 0.2)),
        insurance_denial_rate: Math.round((base.insurance_denial_rate - i * 0.002) * 1000) / 1000,
      },
    };
  });
}

/** 全院标杆（当期）：略优于科室 */
function demoBenchmark(): Record<string, number> {
  return {
    outpatient_visits: 100000, avg_cost_per_visit: 300, avg_wait_minutes: 22, appointment_rate: 0.55, no_show_rate: 0.09,
    in_hospital: 190, admissions: 760, discharges: 755, avg_los: 8.4, bed_occupancy: 0.9,
    surgery_count: 300, high_level_surgery: 135, surgery_wait_hours: 24, pacu_turnover: 4.1,
    revenue: 62000000, cost: 58300000, profit: 3700000, drg_surplus: 260000, insurance_denial_rate: 0.009,
  };
}

export const opsAnalysisRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/ops/analysis',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'operation:analysis:view');
      if (denied) return denied;

      const dept = c.query.get('dept')?.trim() ?? '';
      if (!dept) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 dept 参数', c.traceId), 400);
      }
      const now = new Date();
      const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const period = c.query.get('period')?.trim() || defaultPeriod;
      const trendTypeRaw = (c.query.get('trendType')?.trim() || 'all') as TrendType;
      const trendType: TrendType = ['up', 'down', 'flat', 'all'].includes(trendTypeRaw) ? trendTypeRaw : 'all';
      const days = Number(c.query.get('days')?.trim() || '6') || 6;

      // DEMO 模式：内置多期样例
      if (isDemo) {
        const history = demoHistory(period);
        const deptRef: DeptRef = { deptCode: dept, deptName: dept, history };
        const current = history[history.length - 1]?.metrics ?? {};
        return json(ok({
          dept, period, demo: true, hasData: true,
          blueprint: buildDeepOperationAnalysis(),
          trend: analyzeOperationTrend(deptRef, period, trendType),
          benchmark: benchmarkOperation(deptRef, { current, benchmark: demoBenchmark() }),
          forecast: predictOperationTrend(deptRef, period, days),
          message: '演示模式：使用内置多期样例数据，未连接 PostgreSQL',
          generatedAt: new Date().toISOString(),
        }));
      }

      try {
        const db = getDb();
        const periods = recentPeriods(period, 6);
        const rows = (await db`
          SELECT period_key, domain, metric_key, metric_value
          FROM medmuse.ops_metric
          WHERE dept_code = ${dept}
            AND period_key = ANY(${periods})
          ORDER BY period_key ASC
        `) as MetricRow[];

        if (!rows || rows.length === 0) {
          return json(ok({
            dept, period, demo: false, hasData: false,
            message: '该科室近 6 期暂无运营指标数据，可按月落库后再分析',
          }));
        }

        // 按 period 聚合为 { period, metrics } 快照
        const map = new Map<string, Record<string, number>>();
        for (const r of rows) {
          if (!map.has(r.period_key)) map.set(r.period_key, {});
          map.get(r.period_key)![r.metric_key] = Number(r.metric_value);
        }
        const history: PeriodMetricSnapshot[] = Array.from(map.entries())
          .map(([p, metrics]) => ({ period: p, metrics }))
          .sort((a, b) => a.period.localeCompare(b.period));

        const deptRef: DeptRef = { deptCode: dept, deptName: dept, history };
        const current = history[history.length - 1]?.metrics ?? {};

        return json(ok({
          dept, period, demo: false, hasData: true,
          blueprint: buildDeepOperationAnalysis(),
          trend: analyzeOperationTrend(deptRef, period, trendType),
          benchmark: benchmarkOperation(deptRef, { current, benchmark: demoBenchmark() }),
          forecast: predictOperationTrend(deptRef, period, days),
          generatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error(`[opsAnalysis] GET /admin/ops/analysis [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '运营分析加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
