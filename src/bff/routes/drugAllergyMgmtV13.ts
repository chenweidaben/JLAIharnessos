/**
 * 健澜科技 jlmedaios - 药品过敏管理 V13 路由（M388-C）
 *
 * GET /api/v1/drug-allergy-mgmt
 *
 * 权限：drug-allergy-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAllergyHistoryRegistrationRateV13,
  computeAllergyReactionHandlingRateV13,
  computeSkinTestExecutionRateV13,
  type DrugAllergyMgmtRecordV13,
} from "../aggregators/drugAllergyMgmtV13Aggregator.js";

const records: DrugAllergyMgmtRecordV13[] = [
  { registeredCount: 950, shouldRegisterCount: 1000, executedCount: 900, shouldExecuteCount: 1000, handledCount: 190, reactionCount: 200 },
  { registeredCount: 950, shouldRegisterCount: 1000, executedCount: 900, shouldExecuteCount: 1000, handledCount: 190, reactionCount: 200 },
];

export const drugAllergyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-allergy-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-allergy-mgmt:read");
      if (denied) return denied;
      return json(ok({
        allergyHistoryRegistrationRate: computeAllergyHistoryRegistrationRateV13(records),
        skinTestExecutionRate: computeSkinTestExecutionRateV13(records),
        allergyReactionHandlingRate: computeAllergyReactionHandlingRateV13(records),
      }));
    },
  },
];
