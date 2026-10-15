/**
 * 健澜科技 jlmedaios - 医疗纠纷管理路由（M141-C · 质量与安全）
 *
 * 【质量与安全】医疗纠纷管理：保护医生，也保护患者。
 *   GET  /api/v1/admin/disputes?period=YYYY-MM
 *       返回纠纷台账 + 月度趋势（总量 / 闭环率 / 分类别 / 分状态计数）；
 *       不传 period 默认本月。
 *   POST /api/v1/admin/disputes
 *       登记一起纠纷：{ patientId, visitId, type, description }。
 *
 * 覆盖五类纠纷：服务态度 / 医疗质量 / 费用争议 / 沟通问题 / 其他；
 * 状态闭环：登记 → 调查中 → 协商中 → 已解决 / 已诉讼（状态机由聚合器强校验）。
 *
 * 鉴权：未登录 401 / admin 放行 / 其余需显式权限码
 *   dispute:view（看台账与趋势）、dispute:record（登记纠纷），否则 403。
 *
 * 生产安全：出参 patientId 已脱敏（P0****23），不暴露患者级 PII；
 *   入参非法一律 400 结构化错误信封，不抛 500；
 *   落库 best-effort，断库不阻断主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  analyzeDisputeTrend,
  listDisputes,
  persistDispute,
  registerDispute,
} from '../aggregators/disputeAggregator';

/** 登记纠纷请求体 */
interface RegisterDisputeBody {
  patientId?: unknown;
  visitId?: unknown;
  type?: unknown;
  description?: unknown;
}

/** 当前月 YYYY-MM（本地时区），作为未指定账期时的默认口径 */
function currentPeriod(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  return `${now.getFullYear()}-${m < 10 ? '0' : ''}${m}`;
}

export const disputeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/disputes',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'dispute:view');
      if (denied) return denied;

      const period = c.query.get('period') || currentPeriod();

      try {
        const disputes = listDisputes();
        const trend = analyzeDisputeTrend(period);
        return json(ok({ disputes, trend }, '医疗纠纷台账已加载'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '医疗纠纷数据加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/disputes',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'dispute:record');
      if (denied) return denied;

      let body: RegisterDisputeBody;
      try {
        body = await c.body<RegisterDisputeBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      try {
        const dispute = registerDispute(
          body.patientId,
          body.visitId,
          body.type,
          body.description,
        );
        // best-effort 落库持久化纠纷（断库降级，不阻断登记）
        await persistDispute(dispute);
        return json(ok({ dispute }, '纠纷登记成功'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '纠纷登记失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
