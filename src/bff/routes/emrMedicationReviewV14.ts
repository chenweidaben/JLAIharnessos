/**
 * 健澜科技 jlmedaios - 病历合理用药审查 V14 路由（M537-A）
 *
 * GET  /api/v1/emr-medication-review  （read，auth:true）返回用药审查基础数据
 * POST /api/v1/emr-medication-review  （auth:true）合理用药审查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMedicationReview,
  buildMedicationReviewReport,
  checkMedication,
  type MedicationReviewInputV14,
} from "../aggregators/emrMedicationReviewV14Aggregator.js";

export const emrMedicationReviewV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-medication-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-medication-review:read");
      if (denied) return denied;
      const review = buildMedicationReview("REC400", "心内科");
      return json(ok(review));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-medication-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-medication-review:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: MedicationReviewInputV14 = {
        drugName: String(obj?.drugName ?? ""),
        dosage: Number(obj?.dosage ?? 0),
        hasAllergy: Boolean(obj?.hasAllergy ?? false),
      };
      const result = checkMedication(input);
      const report = buildMedicationReviewReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
