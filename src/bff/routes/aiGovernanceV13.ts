/**
 * 健澜科技 jlmedaios - AI 治理台账 V13 路由（M325-D）
 *
 * GET /api/v1/ai-governance
 *
 * 权限：ai-governance:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  countPendingApprovalV13,
  countRollbackTimesV13,
  listDeployedAiModelsV13,
  type AiModelRecordV13,
} from "../aggregators/aiGovernanceV13Aggregator.js";

const models: AiModelRecordV13[] = [
  { modelName: "影像 AI", version: "v2.3.1", deployDate: "2026-09-01", isPendingApproval: false, rollbackCount: 1 },
  { modelName: "检验 AI", version: "v1.8.0", deployDate: "2026-09-15", isPendingApproval: false, rollbackCount: 0 },
  { modelName: "病历 AI", version: "v3.0.0-beta", deployDate: "2026-10-01", isPendingApproval: true, rollbackCount: 1 },
];

export const aiGovernanceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-governance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-governance:read");
      if (denied) return denied;
      return json(ok({
        deployedModels: listDeployedAiModelsV13(models),
        pendingApproval: countPendingApprovalV13(models),
        rollbackTimes: countRollbackTimesV13(models),
      }));
    },
  },
];
