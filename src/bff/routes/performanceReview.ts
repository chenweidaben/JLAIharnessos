/**
 * 健澜科技 jlmedaios - 个人绩效考核 BFF 路由（医院管理深化 M140-A）
 *
 * GET /api/v1/admin/performance/:period
 *   - :period 账期（YYYY-MM），如 /api/v1/admin/performance/2026-10；
 *   - 带 ?staffId=E1001：返回该员工五维绩效得分（含证据链 calculatePerformanceScore）；
 *   - 不带 staffId：返回该账期全院 / 指定 ?dept=D001 的排名表（generateRanking）；
 *   - auth 守卫：未登录 401 / admin 放行 / 其余需显式权限码 staff:performance:view，否则 403。
 *
 * 生产安全加固：
 *   - 纯聚合结果，不暴露患者级 PII；员工维度仅姓名/科室/得分；
 *   - period 格式非法 / staffId 未命中 → 400 结构化错误信封，不抛 500；
 *   - 仅 GET，无任何状态变更副作用；
 *   - 静态段路由（/dept、/optimizations）在本动态段之前注册，避免被 :period 抢占。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  calculatePerformanceScore,
  generateRanking,
} from '../aggregators/performanceReviewAggregator';

/** 账期格式：YYYY-MM */
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const performanceReviewRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/:period',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 staff:performance:view
      const denied = requirePermissionCode(c, 'staff:performance:view');
      if (denied) return denied;

      const period = (c.params.period ?? '').trim();
      if (!PERIOD_RE.test(period)) {
        return json(
          fail(ErrorCode.BAD_REQUEST, `账期格式应为 YYYY-MM，收到: ${period || '(空)'}`, c.traceId),
          400,
        );
      }

      try {
        const staffId = (c.query.get('staffId') ?? '').trim();
        if (staffId) {
          const score = calculatePerformanceScore(staffId, period);
          return json(ok({ type: 'score', period, score }));
        }

        const dept = (c.query.get('dept') ?? '').trim();
        const ranking = generateRanking(dept || 'ALL', period);
        return json(ok({ type: 'ranking', period, dept: dept || 'ALL', ranking }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '绩效数据加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
