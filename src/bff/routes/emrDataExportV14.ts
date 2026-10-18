/**
 * 健澜科技 jlmedaios - 病历质控数据导出中心 V14 路由（M472-D，M472 收官）
 *
 * POST /api/v1/emr-data-export          （auth:true，body 用 await c.req.json()）创建导出任务
 * GET  /api/v1/emr-data-export/:taskId  （read，auth:true，path 参数 c.params.taskId）查导出状态
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildExportTask,
  computeExportColumns,
} from "../aggregators/emrDataExportV14Aggregator.js";

export const emrDataExportV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-data-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-data-export:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { dataset?: string };
      const dataset = body.dataset ?? "病历";
      const columns = computeExportColumns(dataset);
      const task = buildExportTask(dataset, columns);
      return json(ok({ task }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-data-export/:taskId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-data-export:read");
      if (denied) return denied;
      const taskId = (c.params.taskId ?? "").trim();
      return json(ok({ taskId, status: "pending" }));
    },
  },
];
