/**
 * 健澜科技 jlmedaios - 质控任务签收 V14 路由（M488-B）
 *
 * POST /api/v1/emr-qc-task-receive  （auth:true，body 用 await c.req.json()）执行任务签收
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { receiveQcTask, buildReceiveRecord } from "../aggregators/emrQcTaskReceiveV14Aggregator.js";

export const emrQcTaskReceiveV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-task-receive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-task-receive:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        taskId?: string;
        reviewer?: string;
      };
      const taskId = body.taskId ?? "";
      const reviewer = body.reviewer ?? "";
      const received = receiveQcTask(taskId);
      const record = buildReceiveRecord(taskId, reviewer);
      return json(ok({ received, record }));
    },
  },
];
