/**
 * 健澜科技 jlmedaios - 网络安全防护管理 V13 路由（M446-C，信息化建设与数据安全管理组）
 *
 * GET /api/v1/network-security-mgmt
 *
 * 权限：network-security-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNetworkSecurityDengBaoPassRateV13,
  computeNetworkSecurityIncidentCountV13,
  computeNetworkSecurityVulnFixTimelinessRateV13,
  type NetworkSecurityMgmtRecordV13,
} from "../aggregators/networkSecurityMgmtV13Aggregator.js";

const records: NetworkSecurityMgmtRecordV13[] = [
  { securityIncident: true, timelyFixed: 950, totalVuln: 1000, passed: 900, totalAssessment: 1000 },
  { securityIncident: true, timelyFixed: 950, totalVuln: 1000, passed: 900, totalAssessment: 1000 },
];

export const networkSecurityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/network-security-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "network-security-mgmt:read");
      if (denied) return denied;
      return json(ok({
        networkSecurityIncidentCount: computeNetworkSecurityIncidentCountV13(records),
        networkSecurityVulnFixTimelinessRate: computeNetworkSecurityVulnFixTimelinessRateV13(records),
        networkSecurityDengBaoPassRate: computeNetworkSecurityDengBaoPassRateV13(records),
      }));
    },
  },
];
