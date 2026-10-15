/**
 * 健澜科技 jlmedaios — 药品全生命周期 BFF 路由（M153-B）
 *
 * GET /api/v1/pharmacy/lifecycle                 批次台账 + 近效期(≤90天)预警汇总。
 * PUT /api/v1/pharmacy/recall/:batchNo           问题批次一键召回（仅停指定批次）。
 *
 * 临床决策支持：召回精确到批号，同药品其他批次仍正常销售；统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  getAdverseReactionReport,
  lifecycleView,
  recallDrugBatch,
} from '../aggregators/drugLifecycleAggregator.js';

export const drugLifecycleRoutes: RouteDef[] = [
  {
    method: 'GET', path: '/api/v1/pharmacy/lifecycle', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const view = lifecycleView();
        // 可选：?drugId= 时附带该药品不良反应聚合报告
        const drugId = c.query.get('drugId');
        const adverse = drugId ? getAdverseReactionReport(drugId) : null;
        return json(ok({ ...view, adverse }));
      } catch (e) {
        return json(fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '生命周期查询失败'), 500);
      }
    },
  },
  {
    method: 'PUT', path: '/api/v1/pharmacy/recall/:batchNo', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const batchNo = c.params.batchNo ?? '';
        const body = (await c.body<{ reason?: string }>().catch(() => ({}))) as { reason?: string };
        const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : '药监/临床通报召回';
        const result = recallDrugBatch(batchNo, reason);
        if (result.result === 'not_found') {
          return json(fail(ErrorCode.NOT_FOUND, result.message), 404);
        }
        return json(ok(result));
      } catch (e) {
        return json(fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '召回操作失败'), 500);
      }
    },
  },
];
