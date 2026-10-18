/**
 * 健澜科技 jlmedaios - 科研平台管理 V13 路由（M456-D，M456 收官，学科建设与科研管理组）
 *
 * GET /api/v1/research-platform-mgmt
 *
 * 权限：research-platform-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeResearchPlatformAcceptanceQualifiedRateV13,
  computeResearchPlatformEquipmentSharingRateV13,
  computeResearchPlatformLabOpenRateV13,
  type ResearchPlatformMgmtRecordV13,
} from "../aggregators/researchPlatformMgmtV13Aggregator.js";

const records: ResearchPlatformMgmtRecordV13[] = [
  { opened: 950, totalLab: 1000, shared: 900, totalEquipment: 1000, qualified: 980, totalAcceptance: 1000 },
  { opened: 950, totalLab: 1000, shared: 900, totalEquipment: 1000, qualified: 980, totalAcceptance: 1000 },
];

export const researchPlatformMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-platform-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-platform-mgmt:read");
      if (denied) return denied;
      return json(ok({
        researchPlatformLabOpenRate: computeResearchPlatformLabOpenRateV13(records),
        researchPlatformEquipmentSharingRate: computeResearchPlatformEquipmentSharingRateV13(records),
        researchPlatformAcceptanceQualifiedRate: computeResearchPlatformAcceptanceQualifiedRateV13(records),
      }));
    },
  },
];
