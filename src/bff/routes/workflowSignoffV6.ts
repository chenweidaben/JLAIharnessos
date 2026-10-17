/**
 * 健澜科技 jlmedaios - 工作流节点流转与会签 V6 路由（M288-C）
 *
 * POST /api/v1/workflow/approve 同意
 * POST /api/v1/workflow/reject 驳回
 * GET  /api/v1/workflow/tasks/:instanceId 任务列表
 *
 * 权限：workflow:read / workflow:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  advanceNodeV6,
  countSignoffV6,
  escalateTimeoutV6,
  type WfInstanceV6,
  type WfTaskV6,
} from "../aggregators/workflowSignoffV6Aggregator.js";

const instanceStore: WfInstanceV6[] = [
  { id: "wf-1", currentNodeId: "n1", status: "running", requiredSignoff: 3 },
];

const taskStore: WfTaskV6[] = [
  { id: "t1", instanceId: "wf-1", nodeCode: "n1", assignee: "张三", action: "approve", actedAt: 1000 },
  { id: "t2", instanceId: "wf-1", nodeCode: "n1", assignee: "李四", action: "approve", actedAt: 1000 },
  { id: "t3", instanceId: "wf-1", nodeCode: "n1", assignee: "王五", action: "pending" },
];

export const workflowSignoffV6Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/workflow/approve",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow:write");
      if (denied) return denied;

      const body = await c.req.json() as { instanceId: string; assignee: string; comment: string };
      const inst = instanceStore.find((i) => i.id === body.instanceId);
      if (!inst) {
        return json(ok({ approved: false, reason: "instance not found" }));
      }
      const task: WfTaskV6 = {
        id: `t-${taskStore.length + 1}`,
        instanceId: body.instanceId,
        nodeCode: inst.currentNodeId,
        assignee: body.assignee,
        action: "approve",
        comment: body.comment,
        actedAt: Date.now(),
      };
      taskStore.push(task);
      const currentTasks = taskStore.filter((t) => t.instanceId === body.instanceId);
      const r = advanceNodeV6(inst, currentTasks, "approve", "n2");
      if (r.moved) {
        inst.status = r.newStatus;
      }
      return json(ok({
        result: r,
        signoffCount: countSignoffV6(currentTasks, inst.currentNodeId),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/workflow/reject",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow:write");
      if (denied) return denied;

      const body = await c.req.json() as { instanceId: string; assignee: string; comment: string };
      const inst = instanceStore.find((i) => i.id === body.instanceId);
      if (!inst) {
        return json(ok({ rejected: false, reason: "instance not found" }));
      }
      taskStore.push({
        id: `t-${taskStore.length + 1}`,
        instanceId: body.instanceId,
        nodeCode: inst.currentNodeId,
        assignee: body.assignee,
        action: "reject",
        comment: body.comment,
        actedAt: Date.now(),
      });
      inst.status = "rejected";
      return json(ok({ rejected: true, status: inst.status }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/workflow/tasks/:instanceId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow:read");
      if (denied) return denied;

      const instanceId = c.params.instanceId;
      const tasks = taskStore.filter((t) => t.instanceId === instanceId);
      const inst = instanceStore.find((i) => i.id === instanceId);
      if (!inst) {
        return json(ok({ found: false }));
      }
      return json(ok({
        tasks,
        signoffCount: countSignoffV6(tasks, inst.currentNodeId),
        requiredSignoff: inst.requiredSignoff,
        escalate: tasks.some((t) => t.dueAt !== undefined && escalateTimeoutV6(Date.now(), t.dueAt).escalate),
      }));
    },
  },
];
