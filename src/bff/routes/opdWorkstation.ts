/**
 * 健澜科技 jlmedaios - 门诊医生工作站 BFF 路由
 *
 * GET /api/v1/opd/workstation  门诊医生站一屏数据
 *   （病历模板快捷调用 + 处方历史 + ICD 诊断列表 + 检查检验目录）。
 *
 * 仅登录鉴权（auth:true），不新增权限码、不触碰 WebSocket。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/opdWorkstationAggregator.js';

export const opdWorkstationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/opd/workstation',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const view = await listView();
        return json(ok(view));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '门诊医生站加载失败'),
          500,
        );
      }
    },
  },
];
