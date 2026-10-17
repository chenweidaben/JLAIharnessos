/**
 * 健澜科技 jlmedaios - 信息安全 V13（统计）路由（M363-A，stats避让）
 *
 * GET /api/v1/info-security-stats
 *
 * 权限：info-security-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataBackupSuccessRateV13,
  computeInfoSecurityIncidentCountV13,
  computeSystemAvailabilityRateV13,
  type InfoSecurityStatsRecordV13,
} from "../aggregators/infoSecurityStatsV13Aggregator.js";

const records: InfoSecurityStatsRecordV13[] = [
  { incidentCount: 1, availableHours: 720, requiredHours: 730, backupSuccess: 95, backupTotal: 100 },
  { incidentCount: 1, availableHours: 720, requiredHours: 730, backupSuccess: 95, backupTotal: 100 },
];

export const infoSecurityStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/info-security-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "info-security-stats:read");
      if (denied) return denied;
      return json(ok({
        incidentCount: computeInfoSecurityIncidentCountV13(records),
        systemAvailabilityRate: computeSystemAvailabilityRateV13(records),
        dataBackupSuccessRate: computeDataBackupSuccessRateV13(records),
      }));
    },
  },
];
