/**
 * 健澜科技 jlmedaios - 全院床位图路由
 *
 * GET /api/v1/bed-map  全院床位状态列表（空库/断库自动回退演示数据，demo:true）。
 *
 * 仅登录鉴权（auth:true），不新增权限码、不触碰 WebSocket。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/bedMapAggregator.js';

export const bedMapRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/bed-map',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      return json(ok(await listView()));
    },
  },
];
