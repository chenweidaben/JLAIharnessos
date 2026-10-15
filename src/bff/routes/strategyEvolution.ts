/**
 * 健澜科技 jlmedaios - 智能推荐进化调度路由
 *
 *  - GET /api/v1/medmuse/strategy/metrics
 *    返回各推荐策略的采纳率对比：
 *      strategies  全部策略版本行（含历史版本，即回滚候选列表）；
 *      byType      按建议类型聚合的 采纳/修改/拒绝 计数与采纳率；
 *      comparison  各激活策略的期望采纳率排名、头名与 A/B 判定。
 *
 * 医疗安全：本端点只读，不触发权重发布；策略切换（active 变更）须运营确认。
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  adoptionRateOf,
  expectedAdoptionRate,
  rankStrategies,
  type StrategyPerformance,
  type StrategyWeights,
  type TypeFeedbackCount,
} from '../aggregators/strategyEvolutionAggregator';

/** 无 DB 演示模式：返回样例对比，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 策略版本行（与 medmuse.recommendation_strategy 字段对齐） */
interface StrategyRow {
  id: string;
  strategyName: string;
  targetRole: string | null;
  weights: StrategyWeights;
  version: number;
  active: boolean;
  createdAt: string;
}

function mapRow(r: Record<string, unknown>): StrategyRow {
  return {
    id: r.id as string,
    strategyName: r.strategy_name as string,
    targetRole: (r.target_role as string | null) ?? null,
    weights: (r.weights_json as StrategyWeights) ?? {},
    version: r.version as number,
    active: Boolean(r.active),
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

/**
 * 汇总 GET /metrics：从 DB 读策略版本与反馈日志，纯函数折算后产出对比视图。
 */
async function buildMetricsView(): Promise<unknown> {
  const db = getDb();

  // 1) 全部策略版本行（版本历史即回滚候选）
  const strategyRows = await db`
    SELECT id, strategy_name, target_role, weights_json, version, active, created_at
    FROM medmuse.recommendation_strategy
    ORDER BY strategy_name, version DESC
  `;
  const strategies = (strategyRows as Array<Record<string, unknown>>).map(mapRow);

  // 2) 按建议类型聚合反馈计数（M108 学习闭环样本）
  const fbRows = await db`
    SELECT suggestion_type AS type, doctor_decision AS decision, count(*)::int AS n
    FROM medmuse.ai_feedback_log
    GROUP BY suggestion_type, doctor_decision
  `;
  const stats: Record<string, TypeFeedbackCount> = {};
  let total = 0;
  for (const row of fbRows as unknown as Array<{ type: string | null; decision: string; n: number }>) {
    const key = row.type ?? 'unknown';
    if (!stats[key]) stats[key] = { adopted: 0, modified: 0, rejected: 0 };
    if (row.decision === 'adopted') stats[key].adopted += row.n;
    else if (row.decision === 'modified') stats[key].modified += row.n;
    else if (row.decision === 'rejected') stats[key].rejected += row.n;
    total += row.n;
  }

  // 3) 类型采纳率表 + 看板 byType 视图
  const typeRates: Record<string, number> = {};
  const byType: Record<string, TypeFeedbackCount & { adoptionRate: number }> = {};
  for (const [type, count] of Object.entries(stats)) {
    const rate = adoptionRateOf(count);
    typeRates[type] = rate;
    byType[type] = { ...count, adoptionRate: Math.round(rate * 10000) / 10000 };
  }

  // 4) 各激活策略的期望采纳率排名对比
  const performances: StrategyPerformance[] = strategies
    .filter((s) => s.active)
    .map((s) => {
      const sampleSize = Object.entries(s.weights).reduce((acc, [type]) => {
        const f = stats[type];
        return acc + (f ? f.adopted + f.modified + f.rejected : 0);
      }, 0);
      const rate = expectedAdoptionRate(s.weights, typeRates);
      return {
        strategyId: s.id,
        strategyName: s.strategyName,
        version: s.version,
        adoptionRate: Math.round(rate * 10000) / 10000,
        sampleSize,
      };
    });
  const { ranked, winner, verdict } = rankStrategies(performances);

  return {
    strategies,
    byType,
    feedbackTotal: total,
    comparison: { ranked, winner, verdict },
  };
}

/** 演示模式样例：两条策略做 A/B，v2 权重更向高采纳类型倾斜 */
function demoView(): unknown {
  const stats: Record<string, TypeFeedbackCount> = {
    diagnosis: { adopted: 80, modified: 12, rejected: 8 },
    drug: { adopted: 45, modified: 10, rejected: 25 },
    pathway: { adopted: 30, modified: 5, rejected: 5 },
  };
  const typeRates: Record<string, number> = {};
  const byType: Record<string, TypeFeedbackCount & { adoptionRate: number }> = {};
  for (const [type, c] of Object.entries(stats)) {
    const rate = adoptionRateOf(c);
    typeRates[type] = rate;
    byType[type] = { ...c, adoptionRate: Math.round(rate * 10000) / 10000 };
  }
  const strategies: StrategyRow[] = [
    {
      id: '00000000-0000-4000-8000-000000000a02',
      strategyName: 'default-mix',
      targetRole: 'physician',
      weights: { diagnosis: 0.5, drug: 0.3, pathway: 0.2 },
      version: 2,
      active: true,
      createdAt: '2026-10-15T00:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000a01',
      strategyName: 'default-mix',
      targetRole: 'physician',
      weights: { diagnosis: 0.34, drug: 0.43, pathway: 0.23 },
      version: 1,
      active: false,
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];
  const performances: StrategyPerformance[] = strategies
    .filter((s) => s.active)
    .map((s) => ({
      strategyId: s.id,
      strategyName: s.strategyName,
      version: s.version,
      adoptionRate: Math.round(expectedAdoptionRate(s.weights, typeRates) * 10000) / 10000,
      sampleSize: Object.values(stats).reduce((a, b) => a + b.adopted + b.modified + b.rejected, 0),
    }));
  const { ranked, winner, verdict } = rankStrategies(performances);
  return { strategies, byType, feedbackTotal: 220, comparison: { ranked, winner, verdict } };
}

export const strategyEvolutionRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medmuse/strategy/metrics',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      try {
        const view = isDemo ? demoView() : await buildMetricsView();
        return json(ok(view));
      } catch (err) {
        console.error(`[strategyEvolution] GET /metrics [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '策略对比统计失败', c.traceId),
          500,
        );
      }
    },
  },
];
