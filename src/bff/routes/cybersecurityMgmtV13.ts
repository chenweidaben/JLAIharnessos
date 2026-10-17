/**
 * 健澜科技 jlmedaios - 网络安全管理 V13 路由（M409-C）
 *
 * GET /api/v1/cybersecurity-mgmt
 *
 * 权限：cybersecurity-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClassifiedProtectionTestPassRateV13,
  computeSecurityIncidentResponseTimeV13,
  computeVulnerabilityFixTimelyRateV13,
  type CybersecurityMgmtRecordV13,
} from "../aggregators/cybersecurityMgmtV13Aggregator.js";

const records: CybersecurityMgmtRecordV13[] = [
  { passed: 95, total: 100, fixed: 980, vulnTotal: 1000, responseHours: 2.5 },
  { passed: 95, total: 100, fixed: 980, vulnTotal: 1000, responseHours: 2.5 },
];

export const cybersecurityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cybersecurity-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cybersecurity-mgmt:read");
      if (denied) return denied;
      return json(ok({
        classifiedProtectionTestPassRate: computeClassifiedProtectionTestPassRateV13(records),
        vulnerabilityFixTimelyRate: computeVulnerabilityFixTimelyRateV13(records),
        securityIncidentResponseTime: computeSecurityIncidentResponseTimeV13(records),
      }));
    },
  },
];
