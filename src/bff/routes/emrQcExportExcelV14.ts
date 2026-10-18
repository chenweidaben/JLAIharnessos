/**
 * 健澜科技 jlmedaios - 质控数据导出 Excel V14 路由（M497-A）
 *
 * GET /api/v1/emr-qc-export-excel  （read，auth:true）返回 Excel 导出配置
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildExportExcel, formatExcelRow } from "../aggregators/emrQcExportExcelV14Aggregator.js";

const sampleConfig = buildExportExcel("病历质控月报", ["科室", "缺陷数", "评分"]);
const sampleRow = { 科室: "内科", 缺陷数: "5", 评分: "92" };

export const emrQcExportExcelV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-export-excel",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-export-excel:read");
      if (denied) return denied;
      const formatted = formatExcelRow(sampleRow, sampleConfig.columns);
      return json(ok({ config: sampleConfig, formattedRow: formatted }));
    },
  },
];
