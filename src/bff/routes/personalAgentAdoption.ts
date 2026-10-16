/**
 * 健澜科技 jlmedaios - Doctor MUSE 推荐效果追踪路由
 *
 * GET /api/v1/personal-agent/adoption-stats：
 *   查询当前医生在指定时间窗口内的推荐采纳率统计，
 *   以及低采纳推荐类型识别结果。
 *
 * 权限：personal_agent:adoption:view（医生/admin）。
 * 医疗安全：本端点为只读统计，不回写临床决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  computeAdoptionRate,
  identifyLowAdoptionRecommendations,
  type RecommendationRow,
} from '../aggregators/personalAgentAdoptionAggregator.js';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 默认时间窗口：最近 30 天 */
const DEFAULT_WINDOW_DAYS = 30;

/** 构造演示数据（DEMO_MODE 或 DB 不可用时） */
function buildDemoRows(doctorId: string): RecommendationRow[] {
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const types = ['diagnosis', 'drug', 'pathway', 'lab', 'image'];
  const outcomes: Array<RecommendationRow['outcome']> = ['adopted', 'modified', 'rejected', 'pending'];
  const rows: RecommendationRow[] = [];
  for (let i = 0; i < 60; i++) {
    const t = types[i % types.length];
    const o = outcomes[i % 4 === 3 ? 3 : i % 3];
    rows.push({
      id: `demo-${i}`,
      doctorId,
      suggestionType: t,
      suggestionTitle: `${t} 推荐 #${i}`,
      outcome: o,
      recommendedAt: new Date(now - i * dayMs * 0.5).toISOString(),
    });
  }
  return rows;
}

export const personalAgentAdoptionRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/personal-agent/adoption-stats',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'personal_agent:adoption:view');
      if (denied) return denied;

      // 当前医生 ID（从鉴权上下文取）
      const doctorId = c.user?.id;
      if (!doctorId) {
        return json(fail(ErrorCode.UNAUTHORIZED, '无法识别当前医生身份', c.traceId), 401);
      }

      // 解析时间窗口参数
      const daysParam = c.query.get('days');
      const days = daysParam ? Number(daysParam) : DEFAULT_WINDOW_DAYS;
      if (!Number.isFinite(days) || days <= 0 || days > 365) {
        return json(
          fail(ErrorCode.BAD_REQUEST, 'days 须为 1-365 的整数', c.traceId),
          400,
        );
      }

      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 3600 * 1000);

      try {
        let rows: RecommendationRow[];
        if (isDemo) {
          rows = buildDemoRows(doctorId);
        } else {
          const db = getDb();
          const dbRows = await db`
            SELECT id, doctor_id, suggestion_type, suggestion_title, outcome, recommended_at
            FROM medmuse.personal_agent_recommendations
            WHERE doctor_id = ${doctorId}
              AND recommended_at >= ${from.toISOString()}
              AND recommended_at <= ${to.toISOString()}
            ORDER BY recommended_at DESC
          `;
          rows = (dbRows as unknown as Array<{
            id: string;
            doctor_id: string;
            suggestion_type: string;
            suggestion_title: string;
            outcome: RecommendationRow['outcome'];
            recommended_at: string;
          }>).map((r) => ({
            id: r.id,
            doctorId: r.doctor_id,
            suggestionType: r.suggestion_type,
            suggestionTitle: r.suggestion_title,
            outcome: r.outcome,
            recommendedAt: r.recommended_at,
          }));
        }

        const stats = computeAdoptionRate(rows, doctorId, {
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const lowAdoption = identifyLowAdoptionRecommendations(rows);

        return json(
          ok({
            ...stats,
            lowAdoption,
            windowDays: days,
          }),
        );
      } catch (err) {
        // DB 不可用时降级为演示数据，保证页面可用
        const demoRows = buildDemoRows(doctorId);
        const stats = computeAdoptionRate(demoRows, doctorId, {
          from: from.toISOString(),
          to: to.toISOString(),
        });
        return json(
          ok({
            ...stats,
            lowAdoption: identifyLowAdoptionRecommendations(demoRows),
            windowDays: days,
            degraded: true,
            message: '数据库暂不可用，返回演示数据',
          }),
        );
      }
    },
  },
];
