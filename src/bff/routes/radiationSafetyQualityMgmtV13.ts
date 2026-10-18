/**
 * 健澜科技 jlmedaios - 辐射安全质量管理 V13 路由（M436-B，院感安全环保质量管理深化组）
 *
 * GET /api/v1/radiation-safety-quality-mgmt
 *
 * 权限：radiation-safety-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRadiationIncidentCountV13,
  computeRadiationMonitoringQualifiedRateV13,
  computeRadiationProtectionCompletenessRateV13,
  type RadiationSafetyQualityMgmtRecordV13,
} from "../aggregators/radiationSafetyQualityMgmtV13Aggregator.js";

const records: RadiationSafetyQualityMgmtRecordV13[] = [
  { incidentCount: 2, qualifiedMonitoring: 980, totalMonitoring: 1000, intactProtection: 950, totalProtection: 1000 },
  { incidentCount: 2, qualifiedMonitoring: 980, totalMonitoring: 1000, intactProtection: 950, totalProtection: 1000 },
];

export const radiationSafetyQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/radiation-safety-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "radiation-safety-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        radiationIncidentCount: computeRadiationIncidentCountV13(records),
        radiationMonitoringQualifiedRate: computeRadiationMonitoringQualifiedRateV13(records),
        radiationProtectionCompletenessRate: computeRadiationProtectionCompletenessRateV13(records),
      }));
    },
  },
];
