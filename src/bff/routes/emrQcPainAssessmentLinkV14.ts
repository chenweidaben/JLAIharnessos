/**
 * 健澜科技 jlmedaios - 质控-疼痛评估联动 V14 路由（M517-B）
 *
 * GET  /api/v1/emr-qc-pain-assessment-link  （read，auth:true）返回疼痛评估联动数据
 * POST /api/v1/emr-qc-pain-assessment-link  （auth:true）检查疼痛评估一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPainAssessmentLink,
  buildPainAssessmentLinkReport,
  checkPainAssessmentConsistency,
  type PainAssessmentConsistencyRecordV14,
} from "../aggregators/emrQcPainAssessmentLinkV14Aggregator.js";

export const emrQcPainAssessmentLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-pain-assessment-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pain-assessment-link:read");
      if (denied) return denied;
      const link = buildPainAssessmentLink("REC018", 6, "中度疼痛");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-pain-assessment-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pain-assessment-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: PainAssessmentConsistencyRecordV14 = {
        hasInitial: Boolean(body?.hasInitial),
        hasReassessment: Boolean(body?.hasReassessment),
        hasIntervention: Boolean(body?.hasIntervention),
      };
      const result = checkPainAssessmentConsistency(record);
      const report = buildPainAssessmentLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
