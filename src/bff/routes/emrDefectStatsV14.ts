/**
 * 健澜科技 jlmedaios - 病历缺陷统计分析 V14 路由（M461-B）
 *
 * GET /api/v1/emr-defect-stats （read，auth:true）返回类型统计+科室统计
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateDefectsByDept,
  aggregateDefectsByType,
  type DefectRecordV14,
} from "../aggregators/emrDefectStatsV14Aggregator.js";

const demoRecords: DefectRecordV14[] = [
  { recordId: "D001", dept: "心内科", severity: "block", ruleId: "CR-001", foundAt: "2026-10-18T08:00:00Z" },
  { recordId: "D002", dept: "心内科", severity: "major", ruleId: "CR-003", foundAt: "2026-10-18T09:00:00Z" },
  { recordId: "D003", dept: "普外科", severity: "minor", ruleId: "CR-006", foundAt: "2026-10-18T10:00:00Z" },
];

export const emrDefectStatsV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-defect-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-defect-stats:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({
        byType: aggregateDefectsByType(demoRecords),
        byDept: aggregateDefectsByDept(demoRecords),
      }));
    },
  },
];
