/**
 * 健澜科技 jlmedaios - 质控数据导出 CSV V14 路由（M497-C）
 *
 * GET /api/v1/emr-qc-export-csv  （read，auth:true）返回 CSV 导出配置
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildExportCsv, formatCsvRow } from "../aggregators/emrQcExportCsvV14Aggregator.js";

const sampleConfig = buildExportCsv("质控数据.csv", ",");
const sampleRow = formatCsvRow(["内科", "5", "92"], ",");

export const emrQcExportCsvV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-export-csv",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-export-csv:read");
      if (denied) return denied;
      return json(ok({ config: sampleConfig, sampleRow }));
    },
  },
];
