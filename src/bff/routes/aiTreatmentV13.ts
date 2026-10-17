/**
 * 健澜科技 jlmedaios - AI 辅助治疗 V13 路由（M366-B）
 *
 * GET /api/v1/ai-treatment
 *
 * 权限：ai-treatment:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAiEfficacyPredictAccuracyV13,
  computeAiMedicationAdviceAdoptionRateV13,
  computeAiTreatmentPlanRecommendRateV13,
  type AiTreatmentRecordV13,
} from "../aggregators/aiTreatmentV13Aggregator.js";

const records: AiTreatmentRecordV13[] = [
  { treatmentPlanCount: 1000, aiRecommended: 800, aiEfficacyPredictAccurate: 760, aiMedicationAdopted: 600 },
  { treatmentPlanCount: 1000, aiRecommended: 800, aiEfficacyPredictAccurate: 760, aiMedicationAdopted: 600 },
];

export const aiTreatmentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-treatment",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-treatment:read");
      if (denied) return denied;
      return json(ok({
        aiTreatmentPlanRecommendRate: computeAiTreatmentPlanRecommendRateV13(records),
        aiEfficacyPredictAccuracy: computeAiEfficacyPredictAccuracyV13(records),
        aiMedicationAdviceAdoptionRate: computeAiMedicationAdviceAdoptionRateV13(records),
      }));
    },
  },
];
