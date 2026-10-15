/**
 * 健澜科技 jlmedaios - 个人智能体成长报告 BFF 路由（M146-B · 让每个员工有成就感）
 *
 * 【越用越聪明深化】
 *  - GET /api/v1/user/muse/report
 *      返回当前登录员工的个人成长报告：经验沉淀（成功/失败）、AI 采纳率、
 *      技能标签变化、帮助同事数、近 6 个月成长曲线（vs 3 月前）、成就徽章，
 *      以及本人 vs 同侪的聚合对比。同侪对比只发均值/分位，不发他人明细。
 *
 * 权限：仅需登录（auth:true）；一律限定 staffId = c.user.id，
 *   不接受任何入参指定他人工号，越权在接口层即被拒绝。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  buildPersonalAgentReport,
  getPeerComparison,
} from '../aggregators/personalGrowthAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 未登录兜底响应 */
function needLogin(c: Ctx): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
}

export const personalGrowthRoutes: RouteDef[] = [
  {
    // GET /api/v1/user/muse/report — 本人成长报告 + 同侪对比
    method: 'GET',
    path: '/api/v1/user/muse/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const staffId = c.user.id;

      try {
        // 纯函数聚合：不触库、无副作用；真实环境可在此替换为快照表读取后再喂给纯函数
        const report = buildPersonalAgentReport(staffId);
        const comparison = getPeerComparison(staffId);
        return json(
          ok(
            {
              staffId,
              report,
              comparison,
            },
            '个人成长报告已生成',
            c.traceId,
          ),
        );
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '个人成长报告生成失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
