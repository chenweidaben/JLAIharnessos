/**
 * 健澜科技 jlmedaios - 管理者 Personal Agent（Manager MUSE）工作台 V8 路由（M290-D）
 *
 * GET  /api/v1/agent/manager/todos 今日待办
 * GET  /api/v1/agent/manager/digest 摘要
 * POST /api/v1/agent/manager/todo/complete 完成待办
 *
 * 权限：agent-manager:read / agent-manager:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildManagerDigestV8,
  buildManagerTodoV8,
  prioritizeManagerV8,
  type ManagerApproval,
  type ManagerComplaint,
  type ManagerKpi,
} from "../aggregators/agentManagerV8Aggregator.js";

const kpiStore: ManagerKpi[] = [
  { kpiId: "k1", name: "门诊量", value: 9000, target: 10000 },
  { kpiId: "k2", name: "满意度", value: 92, target: 90 },
];

const complaintStore: ManagerComplaint[] = [
  { complaintId: "c-1", level: "major", title: "排队3小时投诉" },
  { complaintId: "c-2", level: "normal", title: "停车指引不清" },
];

const approvalStore: ManagerApproval[] = [
  { approvalId: "ap-1", title: "50万设备采购" },
];

export const agentManagerV8Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/agent/manager/todos",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-manager:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      void url.searchParams.get("scope");
      const todos = buildManagerTodoV8(kpiStore, complaintStore, approvalStore);
      return json(ok(prioritizeManagerV8(todos)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/manager/digest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-manager:read");
      if (denied) return denied;

      return json(ok(buildManagerDigestV8(kpiStore, complaintStore, approvalStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/agent/manager/todo/complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-manager:write");
      if (denied) return denied;

      const body = await c.req.json() as { todoId: string };
      return json(ok({
        completed: true,
        todoId: body.todoId,
      }));
    },
  },
];
