/**
 * 健澜科技 jlmedaios - 质控任务派发 V14 路由（M488-A）
 *
 * POST /api/v1/emr-qc-task-dispatch  （auth:true，body 用 await c.req.json()）执行任务派发
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDispatchTask, assignQcTask } from "../aggregators/emrQcTaskDispatchV14Aggregator.js";

export const emrQcTaskDispatchV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-task-dispatch",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-task-dispatch:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        recordId?: string;
        reviewer?: string;
      };
      const recordId = body.recordId ?? "";
      const reviewer = body.reviewer ?? "";
      const task = buildDispatchTask(recordId, reviewer);
      const assigned = assignQcTask(recordId, reviewer);
      return json(ok({ task, assigned }));
    },
  },
];
