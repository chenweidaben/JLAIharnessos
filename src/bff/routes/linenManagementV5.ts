/**
 * 健澜科技 jlmedaios - 被服洗涤与织物管理 V5 路由（M279-A）
 *
 * GET  /api/v1/linen-management（各病区织物库存）
 * POST /api/v1/linen-management/issue（洗涤收发）
 * GET  /api/v1/linen-management/loss（损耗报表）
 *
 * 权限：linen-management:read / linen-management:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildLinenManagementV5Report,
  planLinenWashV5,
  type LinenItem,
} from "../aggregators/linenManagementV5Aggregator.js";

const store: LinenItem[] = [
  { itemType: "病号服", ward: "心内科", stock: 80, issued: 200, washing: 30, lost: 5, parLevel: 100 },
  { itemType: "床单", ward: "心内科", stock: 120, issued: 300, washing: 40, lost: 8, parLevel: 150 },
  { itemType: "手术衣", ward: "手术室", stock: 60, issued: 100, washing: 20, lost: 2, parLevel: 80 },
];

export const linenManagementV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/linen-management",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "linen-management:read");
      if (denied) return denied;

      return json(ok(buildLinenManagementV5Report(store)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/linen-management/issue",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "linen-management:write");
      if (denied) return denied;

      const body = await c.req.json() as { itemType: string; ward: string; usage: number; par: number; stock: number };
      const plan = planLinenWashV5(body.usage, body.par, body.stock);
      return json(ok(plan));
    },
  },
  {
    method: "GET",
    path: "/api/v1/linen-management/loss",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "linen-management:read");
      if (denied) return denied;

      return json(ok(buildLinenManagementV5Report(store)));
    },
  },
];
