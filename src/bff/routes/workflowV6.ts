/**
 * 健澜科技 jlmedaios - 智能审批与工作流引擎 V6 路由（M288-A）
 *
 * GET  /api/v1/workflow/definitions 列表
 * GET  /api/v1/workflow/definitions/:id 详情
 * POST /api/v1/workflow/start 发起实例
 * GET  /api/v1/workflow/instances 我的待办
 *
 * 权限：workflow:read / workflow:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildWfGraphV6,
  nextNodeV6,
  startWfV6,
  type WfDefinition,
  type WfInstance,
} from "../aggregators/workflowV6Aggregator.js";

const defStore: WfDefinition[] = [
  {
    id: "def-1",
    name: "请假审批",
    category: "人事",
    version: "v1",
    status: "active",
    nodes: [
      { id: "n1", name: "直属主管", role: "manager", nextOnApprove: "n2" },
      { id: "n2", name: "人事备案", role: "hr", nextOnApprove: null },
    ],
  },
  {
    id: "def-2",
    name: "采购申请",
    category: "财务",
    version: "v1",
    status: "active",
    nodes: [
      { id: "n1", name: "科室主任", role: "director", nextOnApprove: "n2" },
      { id: "n2", name: "财务处长", role: "cfo", nextOnApprove: "n3" },
      { id: "n3", name: "院长审批", role: "ceo", nextOnApprove: null },
    ],
  },
];

const instanceStore: WfInstance[] = [];

export const workflowV6Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/workflow/definitions",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow:read");
      if (denied) return denied;

      return json(ok(defStore.map((d) => ({
        ...d,
        graph: buildWfGraphV6(d.nodes),
      }))));
    },
  },
  {
    method: "GET",
    path: "/api/v1/workflow/definitions/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow:read");
      if (denied) return denied;

      const id = c.params.id;
      const def = defStore.find((d) => d.id === id);
      if (!def) {
        return json(ok({ found: false }));
      }
      return json(ok({
        ...def,
        graph: buildWfGraphV6(def.nodes),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/workflow/start",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow:write");
      if (denied) return denied;

      const body = await c.req.json() as { defId: string; applicant: string; title: string };
      const def = defStore.find((d) => d.id === body.defId);
      if (!def) {
        return json(ok({ started: false, reason: "def not found" }));
      }
      const inst = startWfV6(def, body.applicant, body.title);
      instanceStore.push(inst);
      return json(ok({ instance: inst, graph: buildWfGraphV6(def.nodes) }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/workflow/instances",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow:read");
      if (denied) return denied;

      return json(ok({
        runningCount: instanceStore.filter((i) => i.status === "running").length,
        instances: instanceStore,
        nextStepSample: instanceStore.length > 0
          ? nextNodeV6(defStore[0], instanceStore[instanceStore.length - 1].currentNodeId, "approve")
          : null,
      }));
    },
  },
];
