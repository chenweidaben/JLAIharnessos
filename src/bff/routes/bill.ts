/**
 * 健澜科技 jlmedaios - 住院费用清单路由（按类别汇总 + 明细列表）
 * GET /api/v1/bill?visitId=
 *
 * 仅需登录（auth），不新增/改动权限码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/billAggregator';

export const billRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/bill',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const visitId = c.query.get('visitId') ?? '';
      if (!visitId.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少参数 visitId'), 400);
      }
      try {
        const data = await listView(visitId.trim());
        return json(ok(data));
      } catch (err) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '住院费用清单查询失败'),
          500,
        );
      }
    },
  },
];
