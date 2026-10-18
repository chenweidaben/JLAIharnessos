/**
 * 健澜科技 jlmedaios - 党建管理 V13 路由（M450-B，宣传与党建管理组）
 *
 * GET /api/v1/party-building-mgmt
 *
 * 权限：party-building-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePartyBuildingActivityRateV13,
  computePartyBuildingStudyCoverageRateV13,
  computePartyBuildingTaskCompletionRateV13,
  type PartyBuildingMgmtRecordV13,
} from "../aggregators/partyBuildingMgmtV13Aggregator.js";

const records: PartyBuildingMgmtRecordV13[] = [
  { conducted: 950, planned: 1000, studied: 900, totalMembers: 1000, completed: 980, totalTask: 1000 },
  { conducted: 950, planned: 1000, studied: 900, totalMembers: 1000, completed: 980, totalTask: 1000 },
];

export const partyBuildingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/party-building-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "party-building-mgmt:read");
      if (denied) return denied;
      return json(ok({
        partyBuildingActivityRate: computePartyBuildingActivityRateV13(records),
        partyBuildingStudyCoverageRate: computePartyBuildingStudyCoverageRateV13(records),
        partyBuildingTaskCompletionRate: computePartyBuildingTaskCompletionRateV13(records),
      }));
    },
  },
];
