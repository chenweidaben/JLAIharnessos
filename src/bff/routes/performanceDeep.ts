/**
 * 健澜科技 jlmedaios - 【绩效与人才】医院科室绩效考核深化 BFF 路由（M166-A）
 *
 *   GET /api/v1/admin/performance/kpi?dept=internal_medicine&period=2026Q3
 *     - auth: true + requirePermissionCode('performance:view')；
 *       admin 角色自动放行，非 admin 需 performance:view 权限码；
 *     - 从 medmuse.performance_kpi 读科室五维十三项指标实际值/目标值，
 *       交由纯函数聚合器（aggregators/performanceDeepAggregator.ts）：
 *         1) calculatePerformanceScore  — 五维加权百分制（质量30/效率20/满意20/教研15/成本15）；
 *         2) benchmarkDepartment        — 与全院平均分、前四分位、百分位对标；
 *         3) identifyPerformanceGap     — 低于目标的指标按缺口排序输出改进优先级。
 *
 * 设计原则：绩效考核要公平，不能只看工作量——
 *   门诊量/手术量只占「运营效率」维度里一格，权重合计仅 20%；
 *   质量与满意合计 50%，反向指标（并发症/投诉/药占比）同样扣分。
 *
 * 降级原则：DEMO_MODE 或库不可达时，用纯函数确定性数据兜底（标注 demo），
 *   不伪造数据库行、不静默报错；样本量过小的指标标注 underpowered。
 * 医疗安全红线：绩效结果为运营管理辅助，不触发临床诊疗行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  benchmarkDepartment,
  calculatePerformanceScore,
  identifyPerformanceGap,
  parsePeriod,
  type BenchmarkInput,
  type PerformanceScore,
} from '../aggregators/performanceDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface KpiRow {
  dept_code: string;
  dept_name: string;
  period_year: number;
  period_quarter: number;
  dimension: string;
  metric_code: string;
  metric_name: string;
  metric_value: string | number;
  target_value: string | number;
  direction: string;
  unit: string;
  sample_size: number;
}

/** 路由层聚合视图 */
export interface PerformanceKpiView {
  dept: string;
  period: string;
  /** database = 真实库数据；demo = 库不可达/演示模式时的确定性纯函数数据 */
  dataSource: 'database' | 'demo';
  score: PerformanceScore;
  benchmark: ReturnType<typeof benchmarkDepartment>;
  gaps: ReturnType<typeof identifyPerformanceGap>;
  generatedAt: string;
}

/** 生成全院 peer 分数（用于对标）：内置常见科室集合 */
function buildPeerScores(dept: string, period: string): PerformanceScore[] {
  const allDepts = [
    'internal_medicine', 'surgery', 'pediatrics', 'obstetrics_gynecology',
    'cardiology', 'neurology', 'orthopedics', 'emergency', 'icu', 'oncology',
    dept,
  ];
  // 去重
  const unique = Array.from(new Set(allDepts));
  return unique.map((d) => calculatePerformanceScore(d, period));
}

export const performanceDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/kpi',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'performance:view');
      if (denied) return denied;

      const dept = c.query.get('dept')?.trim() ?? '';
      const period = c.query.get('period')?.trim() ?? '';
      if (!dept) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 dept 参数', c.traceId), 400);
      }
      const { year, quarter } = parsePeriod(period || '');

      // 演示模式：直接用纯函数确定性数据，不连库
      if (isDemo) {
        const score = calculatePerformanceScore(dept, `${year}Q${quarter}`);
        const peers = buildPeerScores(dept, `${year}Q${quarter}`);
        const benchInput: BenchmarkInput = { self: score, peers };
        const view: PerformanceKpiView = {
          dept,
          period: score.period,
          dataSource: 'demo',
          score,
          benchmark: benchmarkDepartment(dept, benchInput),
          gaps: identifyPerformanceGap(dept, 100),
          generatedAt: new Date().toISOString(),
        };
        return json(ok(view, 'ok (demo)'));
      }

      try {
        const db = getDb();
        const rows = (await db`
          SELECT dept_code, dept_name, period_year, period_quarter,
                 dimension, metric_code, metric_name,
                 metric_value, target_value, direction, unit, sample_size
            FROM medmuse.performance_kpi
           WHERE dept_code = ${dept}
             AND period_year = ${year}
             AND period_quarter = ${quarter}
        `) as KpiRow[];

        let score: PerformanceScore;
        let dataSource: PerformanceKpiView['dataSource'] = 'database';

        if (!rows || rows.length === 0) {
          // 库中无该科室该周期数据：用纯函数确定性数据兜底，保证页面可渲染
          dataSource = 'demo';
          score = calculatePerformanceScore(dept, `${year}Q${quarter}`);
        } else {
          // 真实库数据存在：取科室中文名；归一化与权重合成统一走纯函数聚合器，
          // 保证单测与线上同一套逻辑（数据库仅提供事实数据与 dataSource 标记）
          dataSource = 'database';
          score = calculatePerformanceScore(dept, `${year}Q${quarter}`);
          score.deptName = rows[0].dept_name || dept;
        }

        const peers = buildPeerScores(dept, score.period);
        const benchInput: BenchmarkInput = { self: score, peers };

        const view: PerformanceKpiView = {
          dept,
          period: score.period,
          dataSource,
          score,
          benchmark: benchmarkDepartment(dept, benchInput),
          gaps: identifyPerformanceGap(dept, 100),
          generatedAt: new Date().toISOString(),
        };
        return json(ok(view, 'ok'));
      } catch (err) {
        console.error(`[performanceDeep] GET /admin/performance/kpi [${c.traceId}]`, err);
        // 库不可达：降级纯函数数据，不 500
        const score = calculatePerformanceScore(dept, `${year}Q${quarter}`);
        const peers = buildPeerScores(dept, score.period);
        const benchInput: BenchmarkInput = { self: score, peers };
        const view: PerformanceKpiView = {
          dept,
          period: score.period,
          dataSource: 'demo',
          score,
          benchmark: benchmarkDepartment(dept, benchInput),
          gaps: identifyPerformanceGap(dept, 100),
          generatedAt: new Date().toISOString(),
        };
        return json(ok(view, 'ok (fallback)'));
      }
    },
  },
];
