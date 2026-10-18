/**
 * 健澜科技 jlmedaios - 网络安全质量管理 V13 路由（M432-C，-quality 后缀避让旧版 networkSecurityMgmtV13（M409））
 *
 * GET /api/v1/network-security-quality-mgmt
 *
 * 权限：network-security-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNetworkSecurityIncidentCountV13,
  computeNetworkSecurityLevelAssessmentPassRateV13,
  computeNetworkSecurityVulnFixTimelinessRateV13,
  type NetworkSecurityQualityMgmtRecordV13,
} from "../aggregators/networkSecurityQualityMgmtV13Aggregator.js";

const records: NetworkSecurityQualityMgmtRecordV13[] = [
  { incidentCount: 3, timelyFixed: 950, shouldFixVulns: 1000, passedAssessments: 980, totalAssessments: 1000 },
  { incidentCount: 3, timelyFixed: 950, shouldFixVulns: 1000, passedAssessments: 980, totalAssessments: 1000 },
];

export const networkSecurityQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/network-security-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "network-security-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        networkSecurityIncidentCount: computeNetworkSecurityIncidentCountV13(records),
        networkSecurityVulnFixTimelinessRate: computeNetworkSecurityVulnFixTimelinessRateV13(records),
        networkSecurityLevelAssessmentPassRate: computeNetworkSecurityLevelAssessmentPassRateV13(records),
      }));
    },
  },
];
