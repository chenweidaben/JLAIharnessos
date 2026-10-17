/**
 * 健澜科技 jlmedaios - 输血管理（细节）V13 路由（M421-C，detail 避让旧版 bloodTransfusionMgmtV13）
 *
 * GET /api/v1/blood-transfusion-detail
 *
 * 权限：blood-transfusion-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePreTransfusionCheckCompleteRateV13,
  computeTransfusionIndicationReasonableRateV13,
  computeTransfusionReactionOccurrenceRateV13,
  type BloodTransfusionDetailRecordV13,
} from "../aggregators/bloodTransfusionDetailV13Aggregator.js";

const records: BloodTransfusionDetailRecordV13[] = [
  { reasonableIndication: 9800, preCheckComplete: 9900, reactionOccurred: 5, transfusionTotal: 10000 },
  { reasonableIndication: 9800, preCheckComplete: 9900, reactionOccurred: 5, transfusionTotal: 10000 },
];

export const bloodTransfusionDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-transfusion-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-transfusion-detail:read");
      if (denied) return denied;
      return json(ok({
        transfusionIndicationReasonableRate: computeTransfusionIndicationReasonableRateV13(records),
        preTransfusionCheckCompleteRate: computePreTransfusionCheckCompleteRateV13(records),
        transfusionReactionOccurrenceRate: computeTransfusionReactionOccurrenceRateV13(records),
      }));
    },
  },
];
