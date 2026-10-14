/**
 * 健澜科技 jlmedaios - 药品库存预警 BFF 路由
 *
 * GET /api/v1/drug-inventory?threshold=   库存列表 + 低库存预警（含建议采购量）。
 * 登录即可访问（auth），不挂具体权限码；统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/drugInventoryAggregator.js';

/** 解析 threshold query：非法/缺省返回 undefined（聚合器内用默认阈值） */
function parseThreshold(raw: string | null): number | undefined {
  if (!raw || !raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export const drugInventoryRoutes: RouteDef[] = [
  {
    method: 'GET', path: '/api/v1/drug-inventory', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const view = await listView(parseThreshold(c.query.get('threshold')));
        return json(ok(view));
      } catch (e) {
        return json(fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '库存查询失败'), 500);
      }
    },
  },
];
