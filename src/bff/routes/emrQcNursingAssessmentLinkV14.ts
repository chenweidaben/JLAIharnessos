/**
 * 健澜科技 jlmedaios - 质控-护理评估单联动 V14 路由（M517-A）
 *
 * GET  /api/v1/emr-qc-nursing-assessment-link  （read，auth:true）返回护理评估联动数据
 * POST /api/v1/emr-qc-nursing-assessment-link  （auth:true）检查护理评估一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNursingAssessmentLink,
  buildNursingAssessmentLinkReport,
  checkNursingAssessmentConsistency,
  type NursingAssessmentConsistencyRecordV14,
} from "../aggregators/emrQcNursingAssessmentLinkV14Aggregator.js";

export const emrQcNursingAssessmentLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-nursing-assessment-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nursing-assessment-link:read");
      if (denied) return denied;
      const link = buildNursingAssessmentLink("REC017", "李护士", "入院评估");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-nursing-assessment-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nursing-assessment-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: NursingAssessmentConsistencyRecordV14 = {
        hasAdmission: Boolean(body?.hasAdmission),
        hasPeriodic: Boolean(body?.hasPeriodic),
        hasDischarge: Boolean(body?.hasDischarge),
      };
      const result = checkNursingAssessmentConsistency(record);
      const report = buildNursingAssessmentLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
