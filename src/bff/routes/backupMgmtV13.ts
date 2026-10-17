/**
 * 健澜科技 jlmedaios - 备份管理 V13 路由（M379-B）
 *
 * GET /api/v1/backup-mgmt
 *
 * 权限：backup-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBackupSuccessRateV13,
  computeBackupTaskTotalCountV13,
  computeAvgRecoveryTimeHoursV13,
  type BackupMgmtRecordV13,
} from "../aggregators/backupMgmtV13Aggregator.js";

const records: BackupMgmtRecordV13[] = [
  { backupTaskCount: 50, backupSuccessCount: 49, recoveryCount: 5, recoveryHours: 10 },
  { backupTaskCount: 50, backupSuccessCount: 49, recoveryCount: 5, recoveryHours: 10 },
];

export const backupMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/backup-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "backup-mgmt:read");
      if (denied) return denied;
      return json(ok({
        backupTaskTotalCount: computeBackupTaskTotalCountV13(records),
        backupSuccessRate: computeBackupSuccessRateV13(records),
        avgRecoveryTimeHours: computeAvgRecoveryTimeHoursV13(records),
      }));
    },
  },
];
