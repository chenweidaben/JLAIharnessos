/**
 * 健澜科技 jlmedaios - 门诊小手术管理 V13 路由（M458-B，日间手术与门诊操作管理组）
 *
 * GET /api/v1/outpatient-minor-surgery-mgmt
 *
 * 权限：outpatient-minor-surgery-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientMinorSurgeryComplicationRateV13,
  computeOutpatientMinorSurgeryVolumeCountV13,
  computeOutpatientMinorSurgeryWoundHealingRateV13,
  type OutpatientMinorSurgeryMgmtRecordV13,
} from "../aggregators/outpatientMinorSurgeryMgmtV13Aggregator.js";

const records: OutpatientMinorSurgeryMgmtRecordV13[] = [
  { minorSurgeryCount: 950, healed: 900, totalWound: 1000, complication: 98, totalSurgery: 1000 },
  { minorSurgeryCount: 950, healed: 900, totalWound: 1000, complication: 98, totalSurgery: 1000 },
];

export const outpatientMinorSurgeryMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-minor-surgery-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-minor-surgery-mgmt:read");
      if (denied) return denied;
      return json(ok({
        outpatientMinorSurgeryVolumeCount: computeOutpatientMinorSurgeryVolumeCountV13(records),
        outpatientMinorSurgeryWoundHealingRate: computeOutpatientMinorSurgeryWoundHealingRateV13(records),
        outpatientMinorSurgeryComplicationRate: computeOutpatientMinorSurgeryComplicationRateV13(records),
      }));
    },
  },
];
