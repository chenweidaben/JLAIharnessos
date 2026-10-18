/**
 * 健澜科技 jlmedaios - 质控指标导出 V14 路由（M484-D，M484 收官）
 *
 * POST /api/v1/emr-qc-metric-export  （auth:true，body 用 await c.req.json()）执行指标导出
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildExportTask, generateCsvContent } from "../aggregators/emrQcMetricExportV14Aggregator.js";

const demoRows = [
  { dept: "内科", value: 95 },
  { dept: "外科", value: 85 },
  { dept: "儿科", value: 90 },
];

export const emrQcMetricExportV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-metric-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-export:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        metricName?: string;
        format?: string;
      };
      const task = buildExportTask(body.metricName ?? "完整率", body.format ?? "csv");
      const csvContent = generateCsvContent(demoRows);
      return json(ok({ task, csvContent }));
    },
  },
];
