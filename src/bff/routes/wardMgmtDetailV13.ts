/**
 * 健澜科技 jlmedaios - 病房管理（细节）V13 路由（M417-D，M417 收官，detail 避让旧版 inpatientBedMgmtV13）
 *
 * GET /api/v1/ward-mgmt-detail
 *
 * 权限：ward-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeWardAverageLosDaysV13,
  computeWardBedTurnoverRateV13,
  computeWardVisitCompanionMgmtPassRateV13,
  type WardMgmtDetailRecordV13,
} from "../aggregators/wardMgmtDetailV13Aggregator.js";

const records: WardMgmtDetailRecordV13[] = [
  { dischargeTotal: 360, avgBeds: 50, losDays: 8.5, qualified: 950, visitCompanionTotal: 1000 },
  { dischargeTotal: 360, avgBeds: 50, losDays: 9.7, qualified: 950, visitCompanionTotal: 1000 },
];

export const wardMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ward-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ward-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        wardBedTurnoverRate: computeWardBedTurnoverRateV13(records),
        wardAverageLosDays: computeWardAverageLosDaysV13(records),
        wardVisitCompanionMgmtPassRate: computeWardVisitCompanionMgmtPassRateV13(records),
      }));
    },
  },
];
