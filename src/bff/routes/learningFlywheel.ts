/**
 * 健澜科技 jlmedaios - 学习闭环数据飞轮路由
 *
 * GET /api/v1/learning/flywheel：
 *   聚合推荐下发、医生反馈、经验沉淀、采纳率四环节数据，
 *   返回飞轮汇总与趋势线，供前端 ECharts 环形图 + 趋势线渲染。
 *
 * 权限：medmuse:view（医生/admin）。
 * 医疗安全：本端点为只读统计，不回写临床决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  buildLearningFlywheel,
  type FlywheelPoint,
} from '../aggregators/learningFlywheelAggregator.js';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 构造演示数据（最近 14 天） */
function buildDemoPoints(): FlywheelPoint[] {
  const points: FlywheelPoint[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const date = d.toISOString().slice(0, 10);
    // 模拟飞轮越转越快：采纳率从 0.4 逐步升到 0.75
    const progress = (13 - i) / 13;
    const recommendations = 80 + Math.round(Math.random() * 40 + progress * 30);
    const adoptedRate = 0.4 + progress * 0.35;
    const adopted = Math.round(recommendations * adoptedRate);
    const rejected = Math.round(recommendations * (1 - adoptedRate) * 0.4);
    const knowledgeAccumulated = Math.round(adopted * 0.3 + progress * 10);
    points.push({ date, recommendations, adopted, rejected, knowledgeAccumulated });
  }
  return points;
}

export const learningFlywheelRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/learning/flywheel',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      try {
        let points: FlywheelPoint[];
        if (isDemo) {
          points = buildDemoPoints();
        } else {
          const db = getDb();
          const days = Number(c.query.get('days') ?? '14');
          const windowDays = Number.isFinite(days) && days > 0 && days <= 90 ? days : 14;
          const from = new Date(Date.now() - windowDays * 24 * 3600 * 1000);
          const rows = await db`
            SELECT
              DATE(recommended_at) AS date,
              COUNT(*) AS recommendations,
              COUNT(*) FILTER (WHERE outcome IN ('adopted','modified')) AS adopted,
              COUNT(*) FILTER (WHERE outcome = 'rejected') AS rejected,
              COUNT(*) FILTER (WHERE outcome IN ('adopted','modified')) AS knowledge_accumulated
            FROM medmuse.personal_agent_recommendations
            WHERE recommended_at >= ${from.toISOString()}
            GROUP BY DATE(recommended_at)
            ORDER BY date ASC
          `;
          points = (rows as unknown as Array<{
            date: string;
            recommendations: number;
            adopted: number;
            rejected: number;
            knowledge_accumulated: number;
          }>).map((r) => ({
            date: String(r.date),
            recommendations: Number(r.recommendations),
            adopted: Number(r.adopted),
            rejected: Number(r.rejected),
            knowledgeAccumulated: Number(r.knowledge_accumulated),
          }));
        }

        const result = buildLearningFlywheel(points);
        return json(ok(result));
      } catch {
        // DB 不可用时降级为演示数据
        const demoResult = buildLearningFlywheel(buildDemoPoints());
        return json(
          ok({
            ...demoResult,
            degraded: true,
            message: '数据库暂不可用，返回演示数据',
          }),
        );
      }
    },
  },
];
