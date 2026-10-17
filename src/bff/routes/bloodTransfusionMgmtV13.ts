/**
 * 健澜科技 jlmedaios - 输血管理 V13 路由（M414-A）
 *
 * GET /api/v1/blood-transfusion-mgmt
 *
 * 权限：blood-transfusion-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBloodTransfusionIndicationPassRateV13,
  computeBloodTransfusionReactionRateV13,
  computeBloodTransfusionRecordCompletenessRateV13,
  type BloodTransfusionMgmtRecordV13,
} from "../aggregators/bloodTransfusionMgmtV13Aggregator.js";

const records: BloodTransfusionMgmtRecordV13[] = [
  { indicationQualified: 950, transfusionTotal: 1000, reaction: 10, caseTotal: 1000, complete: 980, recordTotal: 1000 },
  { indicationQualified: 950, transfusionTotal: 1000, reaction: 10, caseTotal: 1000, complete: 980, recordTotal: 1000 },
];

export const bloodTransfusionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-transfusion-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-transfusion-mgmt:read");
      if (denied) return denied;
      return json(ok({
        bloodTransfusionIndicationPassRate: computeBloodTransfusionIndicationPassRateV13(records),
        bloodTransfusionReactionRate: computeBloodTransfusionReactionRateV13(records),
        bloodTransfusionRecordCompletenessRate: computeBloodTransfusionRecordCompletenessRateV13(records),
      }));
    },
  },
];
