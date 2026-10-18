/**
 * 健澜科技 jlmedaios - 质控 PDCA 闭环报告 V14 路由（M496-D，M496 收官）
 *
 * GET /api/v1/emr-qc-pdca-report  （read，auth:true）返回 PDCA 报告数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPdcaReport, aggregatePdcaCycle } from "../aggregators/emrQcPdcaReportV14Aggregator.js";

const sampleReport = buildPdcaReport("改进书写规范", "培训医生", "抽查病历", "修订规则");
const sampleCycles = [
  { phase: "P 计划", completed: true },
  { phase: "D 执行", completed: true },
  { phase: "C 检查", completed: true },
  { phase: "A 处理", completed: false },
];

export const emrQcPdcaReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-pdca-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pdca-report:read");
      if (denied) return denied;
      const aggregate = aggregatePdcaCycle(sampleCycles);
      return json(ok({ report: sampleReport, aggregate }));
    },
  },
];
