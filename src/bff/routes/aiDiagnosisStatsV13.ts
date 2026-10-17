/**
 * 健澜科技 jlmedaios - AI 辅助诊断（统计）V13 路由（M366-A，stats避让）
 *
 * GET /api/v1/ai-diagnosis-stats
 *
 * 权限：ai-diagnosis-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAiDiagnosisAccuracyV13,
  computeAiDiagnosisRateV13,
  computeAiSuggestionAdoptionRateV13,
  type AiDiagnosisStatsRecordV13,
} from "../aggregators/aiDiagnosisStatsV13Aggregator.js";

const records: AiDiagnosisStatsRecordV13[] = [
  { caseCount: 1000, aiAssisted: 800, aiAccurate: 760, aiSuggestionAdopted: 600 },
  { caseCount: 1000, aiAssisted: 800, aiAccurate: 760, aiSuggestionAdopted: 600 },
];

export const aiDiagnosisStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-diagnosis-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-diagnosis-stats:read");
      if (denied) return denied;
      return json(ok({
        aiDiagnosisRate: computeAiDiagnosisRateV13(records),
        aiDiagnosisAccuracy: computeAiDiagnosisAccuracyV13(records),
        aiSuggestionAdoptionRate: computeAiSuggestionAdoptionRateV13(records),
      }));
    },
  },
];
