/**
 * 健澜科技 jlmedaios - 医生 Personal Agent 工作台 V8 路由（M290-A）
 *
 * GET  /api/v1/agent/doctor/todos 今日待办
 * GET  /api/v1/agent/doctor/digest 工作台摘要
 * POST /api/v1/agent/doctor/todo/complete 完成待办
 *
 * 权限：agent-doctor:read / agent-doctor:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDoctorDigestV8,
  buildDoctorTodoV8,
  prioritizeTodoV8,
  type AgentAlert,
  type AgentPatient,
  type AgentTask,
} from "../aggregators/agentDoctorV8Aggregator.js";

const patientStore: AgentPatient[] = [
  { patientId: "p-001", admissionCount: 1, avgScore: 72 },
  { patientId: "p-002", admissionCount: 2, avgScore: 45 },
];

const alertStore: AgentAlert[] = [
  { alertId: "a-1", title: "p-002 血压骤升", priority: "high", dueAt: Date.now() - 1000 },
  { alertId: "a-2", title: "p-001 次日随访", priority: "medium", dueAt: Date.now() + 86400000 },
];

const taskStore: AgentTask[] = [
  { taskId: "t-1", title: "签核出院小结", priority: "high", dueAt: Date.now() - 500 },
];

export const agentDoctorV8Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/agent/doctor/todos",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-doctor:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const ownerId = url.searchParams.get("ownerId") ?? "";
      void ownerId;
      const todos = buildDoctorTodoV8(patientStore, alertStore, taskStore);
      return json(ok(prioritizeTodoV8(todos)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/doctor/digest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-doctor:read");
      if (denied) return denied;

      const todos = buildDoctorTodoV8(patientStore, alertStore, taskStore);
      return json(ok(buildDoctorDigestV8(todos, patientStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/agent/doctor/todo/complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-doctor:write");
      if (denied) return denied;

      const body = await c.req.json() as { todoId: string };
      return json(ok({
        completed: true,
        todoId: body.todoId,
      }));
    },
  },
];
