/**
 * 健澜科技 jlmedaios - 隐私保护管理 V13 路由（M425-D，M425 收官，换名避让旧版 informationSecurityMgmtV13（M419））
 *
 * GET /api/v1/privacy-mgmt
 *
 * 权限：privacy-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePrivacyLeakEventCountV13,
  computePrivacyPolicyImplementationRateV13,
  computePrivacyTrainingCoverageRateV13,
  type PrivacyMgmtRecordV13,
} from "../aggregators/privacyMgmtV13Aggregator.js";

const records: PrivacyMgmtRecordV13[] = [
  { leakEvents: 3, trained: 950, shouldTrain: 1000, implementedDept: 98, shouldImplementDept: 100 },
  { leakEvents: 2, trained: 950, shouldTrain: 1000, implementedDept: 98, shouldImplementDept: 100 },
];

export const privacyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/privacy-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "privacy-mgmt:read");
      if (denied) return denied;
      return json(ok({
        privacyLeakEventCount: computePrivacyLeakEventCountV13(records),
        privacyTrainingCoverageRate: computePrivacyTrainingCoverageRateV13(records),
        privacyPolicyImplementationRate: computePrivacyPolicyImplementationRateV13(records),
      }));
    },
  },
];
