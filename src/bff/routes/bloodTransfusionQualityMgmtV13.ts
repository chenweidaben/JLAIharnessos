/**
 * 健澜科技 jlmedaios - 输血质量管理 V13 路由（M430-D，M430 收官，-quality 后缀避让旧版 bloodTransfusionDetailV13（M421））
 *
 * GET /api/v1/blood-transfusion-quality-mgmt
 *
 * 权限：blood-transfusion-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBloodTransfusionIndicationAppropriateRateV13,
  computeBloodTransfusionPreCheckCompleteRateV13,
  computeBloodTransfusionReactionOccurrenceRateV13,
  type BloodTransfusionQualityMgmtRecordV13,
} from "../aggregators/bloodTransfusionQualityMgmtV13Aggregator.js";

const records: BloodTransfusionQualityMgmtRecordV13[] = [
  { indicationAppropriate: 9800, preCheckComplete: 9900, reactionOccurrence: 20, transfusionTotal: 10000 },
  { indicationAppropriate: 9800, preCheckComplete: 9900, reactionOccurrence: 20, transfusionTotal: 10000 },
];

export const bloodTransfusionQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-transfusion-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-transfusion-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        bloodTransfusionIndicationAppropriateRate: computeBloodTransfusionIndicationAppropriateRateV13(records),
        bloodTransfusionPreCheckCompleteRate: computeBloodTransfusionPreCheckCompleteRateV13(records),
        bloodTransfusionReactionOccurrenceRate: computeBloodTransfusionReactionOccurrenceRateV13(records),
      }));
    },
  },
];
