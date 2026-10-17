/**
 * 健澜科技 jlmedaios - 护士 Personal Agent（Nurse MUSE）工作台 V8 路由（M290-B）
 *
 * GET  /api/v1/agent/nurse/todos 今日待办
 * GET  /api/v1/agent/nurse/digest 摘要
 * POST /api/v1/agent/nurse/todo/complete 完成待办
 *
 * 权限：agent-nurse:read / agent-nurse:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNurseDigestV8,
  buildNurseTodoV8,
  prioritizeNurseV8,
  type NurseBed,
  type NurseIvTask,
  type NursePressureRisk,
} from "../aggregators/agentNurseV8Aggregator.js";

const bedStore: NurseBed[] = [
  { bedId: "01-101-1", patientId: "p-001", ward: "心内科一病区" },
  { bedId: "01-101-2", patientId: "p-002", ward: "心内科一病区" },
];

const ivStore: NurseIvTask[] = [
  { taskId: "iv-1", bedId: "01-101-1", drug: "头孢呋辛" },
];

const riskStore: NursePressureRisk[] = [
  { riskId: "rp-1", bedId: "01-101-2", level: "high" },
  { riskId: "rp-2", bedId: "01-101-1", level: "medium" },
];

export const agentNurseV8Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/agent/nurse/todos",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-nurse:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      void url.searchParams.get("ward");
      const todos = buildNurseTodoV8(bedStore, ivStore, riskStore);
      return json(ok(prioritizeNurseV8(todos)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/nurse/digest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-nurse:read");
      if (denied) return denied;

      return json(ok(buildNurseDigestV8(bedStore, riskStore, ivStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/agent/nurse/todo/complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-nurse:write");
      if (denied) return denied;

      const body = await c.req.json() as { todoId: string };
      return json(ok({
        completed: true,
        todoId: body.todoId,
      }));
    },
  },
];
