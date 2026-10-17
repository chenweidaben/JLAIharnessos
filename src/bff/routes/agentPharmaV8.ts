/**
 * 健澜科技 jlmedaios - 药师 Personal Agent（Pharma MUSE）工作台 V8 路由（M290-C）
 *
 * GET  /api/v1/agent/pharma/todos 今日待办
 * GET  /api/v1/agent/pharma/digest 摘要
 * POST /api/v1/agent/pharma/todo/complete 完成待办
 *
 * 权限：agent-pharma:read / agent-pharma:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPharmaDigestV8,
  buildPharmaTodoV8,
  prioritizePharmaV8,
  type PharmaInteractionAlert,
  type PharmaReviewItem,
  type PharmaStockItem,
} from "../aggregators/agentPharmaV8Aggregator.js";

const reviewQueue: PharmaReviewItem[] = [
  { reviewId: "rv-1", prescriptionId: "rx-1" },
  { reviewId: "rv-2", prescriptionId: "rx-2" },
];

const stockList: PharmaStockItem[] = [
  { drugCode: "WARFARIN", onHand: 20, threshold: 100 },
];

const alertList: PharmaInteractionAlert[] = [
  { alertId: "ia-1", drugA: "WARFARIN", drugB: "ASPIRIN", severity: "high" },
];

export const agentPharmaV8Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/agent/pharma/todos",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-pharma:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      void url.searchParams.get("dept");
      const todos = buildPharmaTodoV8(reviewQueue, stockList, alertList);
      return json(ok(prioritizePharmaV8(todos)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/pharma/digest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-pharma:read");
      if (denied) return denied;

      return json(ok(buildPharmaDigestV8(reviewQueue, stockList, alertList)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/agent/pharma/todo/complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-pharma:write");
      if (denied) return denied;

      const body = await c.req.json() as { todoId: string };
      return json(ok({
        completed: true,
        todoId: body.todoId,
      }));
    },
  },
];
