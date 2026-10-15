/**
 * 健澜科技 jlmedaios - 推荐策略自学习 BFF 路由（越用越聪明深化）
 *
 * GET  /api/v1/admin/self-learning/log
 *   - auth: true + requirePermissionCode('self-learning:view')；仅 admin 可读；
 *   - 查询参数 days（窗口天数，默认 7，取值 1..90，越界收敛）；
 *   - 从 medmuse.strategy_weight_log 拉近期留痕，交给纯函数 getSelfLearningLog
 *     做窗口过滤与倒序排序后返回，供自学习监控页展示。
 *
 * POST /api/v1/admin/self-learning/optimize
 *   - auth: true + requirePermissionCode('self-learning:view')；
 *   - 接收 strategyId / currentWeights / typeFeedback / scenarioSamples，
 *     调用纯函数 autoOptimizeRecommendations 完成采纳率驱动的权重有界调整
 *     （单次 ±20%、截断 [0.1,3.0]、新场景样本足后自动上线），
 *     并将本次优化结果写入 medmuse.strategy_weight_log 留痕。
 *
 * 自学习可控：路由层不绕过聚合器的幅度限制，只负责落库与时间戳注入。
 * 医疗安全：自学习结果仅辅助推荐排序，最终诊疗由医生本人判断执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  autoOptimizeRecommendations,
  getSelfLearningLog,
  type FeedbackData,
  type WeightLogRow,
  type WeightMap,
} from '../aggregators/selfLearningAggregator';

/** 无 DB 演示模式：仅计算并返回结果，不写 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** POST optimize 请求体 */
interface OptimizeBody {
  /** 策略标识，缺省 default-recommend */
  strategyId?: string;
  /** 当前权重分布（必填，非空「类型 -> 正数权重」映射） */
  currentWeights?: WeightMap;
  /** 各建议类型最近窗口反馈 */
  typeFeedback?: FeedbackData['typeFeedback'];
  /** 新场景样本 */
  scenarioSamples?: FeedbackData['scenarioSamples'];
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

/** 归一 jsonb 列：postgres.js 通常已解析为对象，兜底处理字符串 */
function asWeightMap(v: unknown): WeightMap {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as WeightMap;
  }
  if (typeof v === 'string' && v.trim()) {
    try {
      return JSON.parse(v) as WeightMap;
    } catch {
      return {};
    }
  }
  return {};
}

/** 时间列归一为 ISO 字符串（pg 返回 Date 对象，统一口径） */
function asIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return v ? new Date(v as string).toISOString() : new Date(0).toISOString();
}

export const selfLearningRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/self-learning/log',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'self-learning:view');
      if (denied) return denied;
      try {
        // 窗口天数：默认 7，越界收敛到 1..90
        const rawDays = Number(c.query.get('days') ?? '7');
        const days = Number.isFinite(rawDays)
          ? Math.min(90, Math.max(1, Math.floor(rawDays)))
          : 7;

        let rows: WeightLogRow[] = [];
        if (!isDemo) {
          const db = getDb();
          const dbRows = await db`
            SELECT
              strategy_id         AS "strategyId",
              run_date            AS "runDate",
              old_weights         AS "oldWeights",
              new_weights         AS "newWeights",
              adopted_count       AS "adoptedCount",
              rejected_count      AS "rejectedCount",
              adopted_rate       AS "adoptedRate",
              adjustment_ratio    AS "adjustmentRatio",
              status              AS "status",
              created_at          AS "createdAt"
            FROM medmuse.strategy_weight_log
            ORDER BY created_at DESC
            LIMIT 500
          `;
          rows = (dbRows as unknown as Array<Record<string, unknown>>).map((r) => ({
            strategyId: String(r.strategyId ?? ''),
            runDate: String(r.runDate ?? ''),
            oldWeights: asWeightMap(r.oldWeights),
            newWeights: asWeightMap(r.newWeights),
            adoptedCount: Number(r.adoptedCount ?? 0),
            rejectedCount: Number(r.rejectedCount ?? 0),
            adoptedRate: Number(r.adoptedRate ?? 0),
            adjustmentRatio: Number(r.adjustmentRatio ?? 0),
            status: String(r.status ?? 'applied'),
            createdAt: asIso(r.createdAt),
          }));
        }

        const items = getSelfLearningLog({ days }, rows, Date.now());
        return json(ok({ days, total: items.length, items }));
      } catch (err) {
        console.error(`[selfLearning] GET /log [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '自学习日志查询失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/self-learning/optimize',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'self-learning:view');
      if (denied) return denied;

      let body: OptimizeBody;
      try {
        body = await c.body<OptimizeBody>();
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

      const strategyId = body.strategyId?.trim() || 'default-recommend';
      try {
        const result = autoOptimizeRecommendations(strategyId, {
          currentWeights: body.currentWeights,
          typeFeedback: body.typeFeedback ?? {},
          scenarioSamples: body.scenarioSamples ?? {},
        });

        let insertedId: string | null = null;
        if (!isDemo) {
          const db = getDb();
          const runDate = new Date().toISOString().slice(0, 10);
          const rows = await db`
            INSERT INTO medmuse.strategy_weight_log
              (run_date, strategy_id, old_weights, new_weights,
               adopted_count, rejected_count, adopted_rate,
               adjustment_ratio, accepted_delta, rejected_delta, status)
            VALUES
              (${runDate}, ${strategyId},
               ${JSON.stringify(result.log.oldWeights)}::jsonb,
               ${JSON.stringify(result.log.newWeights)}::jsonb,
               ${result.log.adoptedCount},
               ${result.log.rejectedCount},
               ${result.log.adoptedRate},
               ${result.log.adjustmentRatio},
               ${result.log.acceptedDelta},
               ${result.log.rejectedDelta},
               ${result.log.status})
            RETURNING id
          `;
          insertedId = (rows[0] as { id: string }).id;
        }

        return json(
          ok({
            strategyId,
            weights: result.weights,
            pendingScenarios: result.pendingScenarios,
            log: result.log,
            insertedId,
          }),
        );
      } catch (err) {
        console.error(`[selfLearning] POST /optimize [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '自学习权重优化失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
