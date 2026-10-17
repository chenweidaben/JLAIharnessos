/**
 * 健澜科技 jlmedaios - AI 管理应用 V13 路由（M366-C）
 *
 * GET /api/v1/ai-management
 *
 * 权限：ai-management:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAiOperationDecisionCountV13,
  computeAiResourceDispatchCountV13,
  computeAiWarningAccuracyRateV13,
  type AiManagementRecordV13,
} from "../aggregators/aiManagementV13Aggregator.js";

const records: AiManagementRecordV13[] = [
  { operationDecisionCount: 10, resourceDispatchCount: 15, warningTotal: 100, warningAccurate: 80 },
  { operationDecisionCount: 20, resourceDispatchCount: 25, warningTotal: 100, warningAccurate: 80 },
];

export const aiManagementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-management",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-management:read");
      if (denied) return denied;
      return json(ok({
        aiOperationDecisionCount: computeAiOperationDecisionCountV13(records),
        aiResourceDispatchCount: computeAiResourceDispatchCountV13(records),
        aiWarningAccuracyRate: computeAiWarningAccuracyRateV13(records),
      }));
    },
  },
];
