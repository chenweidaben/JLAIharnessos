/**
 * 健澜科技 jlmedaios - 质控任务退回 V14 路由（M488-C）
 *
 * POST /api/v1/emr-qc-task-return  （auth:true，body 用 await c.req.json()）执行任务退回
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { returnQcTask, buildReturnRecord } from "../aggregators/emrQcTaskReturnV14Aggregator.js";

export const emrQcTaskReturnV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-task-return",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-task-return:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        taskId?: string;
        reason?: string;
        reviewer?: string;
      };
      const taskId = body.taskId ?? "";
      const reason = body.reason ?? "";
      const reviewer = body.reviewer ?? "";
      const returned = returnQcTask(taskId, reason);
      const record = buildReturnRecord(taskId, reason, reviewer);
      return json(ok({ returned, record }));
    },
  },
];
