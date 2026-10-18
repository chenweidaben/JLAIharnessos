/**
 * 健澜科技 jlmedaios - 手术麻醉管理 V13 路由（M454-C，门急诊与手术麻醉管理组）
 *
 * GET /api/v1/surgery-anesthesia-mgmt
 *
 * 权限：surgery-anesthesia-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSurgeryAnesthesiaComplicationRateV13,
  computeSurgeryAnesthesiaOnTimeStartRateV13,
  computeSurgeryAnesthesiaPreAssessmentRateV13,
  type SurgeryAnesthesiaMgmtRecordV13,
} from "../aggregators/surgeryAnesthesiaMgmtV13Aggregator.js";

const records: SurgeryAnesthesiaMgmtRecordV13[] = [
  { onTime: 950, totalSurgery: 1000, assessed: 900, totalAnesthesia: 1000, complication: 30 },
  { onTime: 950, totalSurgery: 1000, assessed: 900, totalAnesthesia: 1000, complication: 30 },
];

export const surgeryAnesthesiaMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/surgery-anesthesia-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "surgery-anesthesia-mgmt:read");
      if (denied) return denied;
      return json(ok({
        surgeryAnesthesiaOnTimeStartRate: computeSurgeryAnesthesiaOnTimeStartRateV13(records),
        surgeryAnesthesiaPreAssessmentRate: computeSurgeryAnesthesiaPreAssessmentRateV13(records),
        surgeryAnesthesiaComplicationRate: computeSurgeryAnesthesiaComplicationRateV13(records),
      }));
    },
  },
];
