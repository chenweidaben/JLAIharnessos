/**
 * 健澜科技 jlmedaios - 质控任务归档 V14 路由（M488-D，M488 收官）
 *
 * POST /api/v1/emr-qc-task-archive  （auth:true，body 用 await c.req.json()）执行任务归档
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { archiveQcTask, buildArchiveRecord } from "../aggregators/emrQcTaskArchiveV14Aggregator.js";

export const emrQcTaskArchiveV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-task-archive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-task-archive:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        taskId?: string;
        reviewer?: string;
        result?: string;
      };
      const taskId = body.taskId ?? "";
      const reviewer = body.reviewer ?? "";
      const result = body.result ?? "";
      const archived = archiveQcTask(taskId);
      const record = buildArchiveRecord(taskId, reviewer, result);
      return json(ok({ archived, record }));
    },
  },
];
