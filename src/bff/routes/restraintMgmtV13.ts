/**
 * 健澜科技 jlmedaios - 身体约束管理 V13 路由（M422-D，M422 收官）
 *
 * GET /api/v1/restraint-mgmt
 *
 * 权限：restraint-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePhysicalRestraintUsageRateV13,
  computeRestraintComplicationRateV13,
  computeRestraintInformedConsentRateV13,
  type RestraintMgmtRecordV13,
} from "../aggregators/restraintMgmtV13Aggregator.js";

const records: RestraintMgmtRecordV13[] = [
  { restraintUsed: 80, inpatientTotal: 10000, complicationOccurred: 4, informedConsentSigned: 78 },
  { restraintUsed: 80, inpatientTotal: 10000, complicationOccurred: 4, informedConsentSigned: 78 },
];

export const restraintMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/restraint-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "restraint-mgmt:read");
      if (denied) return denied;
      return json(ok({
        physicalRestraintUsageRate: computePhysicalRestraintUsageRateV13(records),
        restraintComplicationRate: computeRestraintComplicationRateV13(records),
        restraintInformedConsentRate: computeRestraintInformedConsentRateV13(records),
      }));
    },
  },
];
