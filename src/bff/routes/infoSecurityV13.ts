/**
 * 健澜科技 jlmedaios - 信息安全 V13 路由（M353-A）
 *
 * GET /api/v1/info-security
 *
 * 权限：info-security:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnnualDrillCountV13,
  computeMLPS3ComplianceRateV13,
  computeVulnerabilityPatchRateV13,
  type InfoSecurityRecordV13,
} from "../aggregators/infoSecurityV13Aggregator.js";

const records: InfoSecurityRecordV13[] = [
  { vulnerabilityFixedOnTime: 19, vulnerabilityHighCount: 20, mlps3CompliantItems: 95, mlps3TotalItems: 100, annualDrillCount: 2 },
  { vulnerabilityFixedOnTime: 18, vulnerabilityHighCount: 20, mlps3CompliantItems: 95, mlps3TotalItems: 100, annualDrillCount: 2 },
];

export const infoSecurityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/info-security",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "info-security:read");
      if (denied) return denied;
      return json(ok({
        vulnerabilityPatchRate: computeVulnerabilityPatchRateV13(records),
        mlps3ComplianceRate: computeMLPS3ComplianceRateV13(records),
        annualDrillCount: computeAnnualDrillCountV13(records),
      }));
    },
  },
];
