/**
 * 健澜科技 jlmedaios - 备份与容灾 V13 路由（M353-D，M353 收官）
 *
 * GET /api/v1/backup-dr
 *
 * 权限：backup-dr:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBackupSuccessRateV13,
  computeRPOComplianceRateV13,
  computeRTOComplianceRateV13,
  type BackupDRRecordV13,
} from "../aggregators/backupDRV13Aggregator.js";

const records: BackupDRRecordV13[] = [
  { backupSuccessCount: 99, backupTotalCount: 100, rtoPassedCount: 5, rtoTestedCount: 5, rpoPassedCount: 4, rpoTestedCount: 5 },
  { backupSuccessCount: 98, backupTotalCount: 100, rtoPassedCount: 5, rtoTestedCount: 5, rpoPassedCount: 5, rpoTestedCount: 5 },
];

export const backupDRV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/backup-dr",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "backup-dr:read");
      if (denied) return denied;
      return json(ok({
        backupSuccessRate: computeBackupSuccessRateV13(records),
        rtoComplianceRate: computeRTOComplianceRateV13(records),
        rpoComplianceRate: computeRPOComplianceRateV13(records),
      }));
    },
  },
];
