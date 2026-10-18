/**
 * 健澜科技 jlmedaios - 质控数据导出 PDF V14 路由（M497-B）
 *
 * GET /api/v1/emr-qc-export-pdf  （read，auth:true）返回 PDF 导出配置
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildExportPdf, formatPdfPage } from "../aggregators/emrQcExportPdfV14Aggregator.js";

const sampleConfig = buildExportPdf("质控报告", "A4");
const samplePage = formatPdfPage("质控月报", "内科缺陷5例");

export const emrQcExportPdfV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-export-pdf",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-export-pdf:read");
      if (denied) return denied;
      return json(ok({ config: sampleConfig, page: samplePage }));
    },
  },
];
