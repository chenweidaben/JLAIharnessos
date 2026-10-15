/**
 * 健澜科技 jlmedaios - 学习引擎自进化调度路由
 *
 * POST /api/v1/learning/auto-evolve（手动触发）：
 *   接收当前权重分布与最近 7 天反馈统计，调用纯函数 autoEvolveWeights
 *   完成采纳率驱动的权重自动调整，并将本次进化结果写入
 *   medmuse.weight_evolution_log 留痕。
 *
 * 依据宪法第三章：权重决策影响临床推荐排序，每次进化均落库可追溯；
 *               本端点仅调整推荐排序权重，不直接改写临床决策。
 *
 * 医疗安全：进化结果为辅助排序，最终诊疗由医生本人判断执行。
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  autoEvolveWeights,
  FEEDBACK_WINDOW_DAYS,
  type FeedbackStats,
  type WeightMap,
} from '../aggregators/weightEvolutionAggregator';

/** 无 DB 演示模式：仅计算并返回结果，不写 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 手动触发请求体 */
interface AutoEvolveBody {
  /** 策略名，缺省 default-mix */
  strategyName?: string;
  /** 当前权重分布（必填，非空「类型 -> 正数权重」映射） */
  currentWeights?: WeightMap;
  /** 各建议类型最近 7 天反馈统计（缺省为空，权重保持不动） */
  feedbackStats?: FeedbackStats;
}

/** 校验权重对象：必须是「字符串 -> 有限正数」的非空映射 */
function isValidWeights(w: unknown): w is WeightMap {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
  const entries = Object.entries(w as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.every(
    ([, v]) => typeof v === 'number' && Number.isFinite(v) && v > 0,
  );
}

export const weightEvolutionRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/learning/auto-evolve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      let body: AutoEvolveBody;
      try {
        body = await c.body<AutoEvolveBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }
      if (!body || !isValidWeights(body.currentWeights)) {
        return json(
          fail(
            ErrorCode.BAD_REQUEST,
            'currentWeights 必须为非空的「类型->正数权重」映射',
            c.traceId,
          ),
          400,
        );
      }

      const feedbackStats = (body.feedbackStats ?? {}) as FeedbackStats;
      const strategyName = body.strategyName?.trim() || 'default-mix';

      try {
        const result = autoEvolveWeights(body.currentWeights, feedbackStats);

        let insertedId: string | null = null;
        if (!isDemo) {
          const db = getDb();
          const runDate = new Date().toISOString().slice(0, 10);
          const rows = await db`
            INSERT INTO medmuse.weight_evolution_log
              (run_date, strategy_name, old_weights, new_weights,
               feedback_window_days, accepted_delta, rejected_delta)
            VALUES
              (${runDate}, ${strategyName},
               ${JSON.stringify(result.log.oldWeights)}::jsonb,
               ${JSON.stringify(result.log.newWeights)}::jsonb,
               ${FEEDBACK_WINDOW_DAYS},
               ${result.log.acceptedDelta},
               ${result.log.rejectedDelta})
            RETURNING id
          `;
          insertedId = (rows[0] as { id: string }).id;
        }

        return json(
          ok({
            strategyName,
            feedbackWindowDays: FEEDBACK_WINDOW_DAYS,
            newWeights: result.newWeights,
            acceptedDelta: result.log.acceptedDelta,
            rejectedDelta: result.log.rejectedDelta,
            insertedId,
          }),
        );
      } catch (err) {
        console.error(`[weightEvolution] POST /auto-evolve [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '权重自进化失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
