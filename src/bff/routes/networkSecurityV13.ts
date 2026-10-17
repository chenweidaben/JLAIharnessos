/**
 * 健澜科技 jlmedaios - 网络安全 V13 路由（M363-C）
 *
 * GET /api/v1/network-security
 *
 * 权限：network-security:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClassifiedProtectionComplianceRateV13,
  computeHighRiskVulnerabilityFixRateV13,
  computeNetworkAttackBlockedCountV13,
  type NetworkSecurityRecordV13,
} from "../aggregators/networkSecurityV13Aggregator.js";

const records: NetworkSecurityRecordV13[] = [
  { attackBlocked: 1000, vulnerabilityFixed: 95, vulnerabilityFound: 100, classifiedCompliant: 9, classifiedRequired: 10 },
  { attackBlocked: 1000, vulnerabilityFixed: 95, vulnerabilityFound: 100, classifiedCompliant: 9, classifiedRequired: 10 },
];

export const networkSecurityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/network-security",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "network-security:read");
      if (denied) return denied;
      return json(ok({
        attackBlocked: computeNetworkAttackBlockedCountV13(records),
        highRiskVulnerabilityFixRate: computeHighRiskVulnerabilityFixRateV13(records),
        classifiedProtectionComplianceRate: computeClassifiedProtectionComplianceRateV13(records),
      }));
    },
  },
];
