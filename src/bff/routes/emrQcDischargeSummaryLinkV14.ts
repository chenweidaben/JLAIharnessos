/**
 * 健澜科技 jlmedaios - 质控-出院小结联动 V14 路由（M516-B）
 *
 * GET  /api/v1/emr-qc-discharge-summary-link  （read，auth:true）返回出院小结联动数据
 * POST /api/v1/emr-qc-discharge-summary-link  （auth:true）检查出院小结一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDischargeSummaryLink,
  buildDischargeSummaryLinkReport,
  checkDischargeSummaryConsistency,
  type DischargeSummaryConsistencyRecordV14,
} from "../aggregators/emrQcDischargeSummaryLinkV14Aggregator.js";

export const emrQcDischargeSummaryLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-discharge-summary-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-discharge-summary-link:read");
      if (denied) return denied;
      const link = buildDischargeSummaryLink("REC014", "2026-10-15", "2026-10-29");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-discharge-summary-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-discharge-summary-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: DischargeSummaryConsistencyRecordV14 = {
        hasDiagnosis: Boolean(body?.hasDiagnosis),
        hasTreatment: Boolean(body?.hasTreatment),
        hasFollowUp: Boolean(body?.hasFollowUp),
      };
      const result = checkDischargeSummaryConsistency(record);
      const report = buildDischargeSummaryLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
