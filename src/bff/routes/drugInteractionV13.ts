/**
 * 健澜科技 jlmedaios - 药物相互作用 V13 路由（M368-B）
 *
 * GET /api/v1/drug-interaction
 *
 * 权限：drug-interaction:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugInteractionWarningCountV13,
  computeMedicationErrorCountV13,
  computeWarningInterceptRateV13,
  type DrugInteractionRecordV13,
} from "../aggregators/drugInteractionV13Aggregator.js";

const records: DrugInteractionRecordV13[] = [
  { interactionWarningCount: 50, warningIntercepted: 45, medicationErrorCount: 5 },
  { interactionWarningCount: 50, warningIntercepted: 45, medicationErrorCount: 5 },
];

export const drugInteractionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-interaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-interaction:read");
      if (denied) return denied;
      return json(ok({
        drugInteractionWarningCount: computeDrugInteractionWarningCountV13(records),
        warningInterceptRate: computeWarningInterceptRateV13(records),
        medicationErrorCount: computeMedicationErrorCountV13(records),
      }));
    },
  },
];
