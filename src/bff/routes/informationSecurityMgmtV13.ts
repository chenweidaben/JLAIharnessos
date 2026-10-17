/**
 * 健澜科技 jlmedaios - 信息安全管理 V13 路由（M419-B）
 *
 * GET /api/v1/information-security-mgmt
 *
 * 权限：information-security-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataBackupSuccessRateV13,
  computeInfoSecEventResponseHoursV13,
  computeSystemVulnFixTimelyRateV13,
  type InformationSecurityMgmtRecordV13,
} from "../aggregators/informationSecurityMgmtV13Aggregator.js";

const records: InformationSecurityMgmtRecordV13[] = [
  { responseHours: 3.6, backupSuccess: 990, backupTotal: 1000, vulnFixTimely: 950, vulnTotal: 1000 },
  { responseHours: 4.5, backupSuccess: 990, backupTotal: 1000, vulnFixTimely: 950, vulnTotal: 1000 },
];

export const informationSecurityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/information-security-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "information-security-mgmt:read");
      if (denied) return denied;
      return json(ok({
        infoSecEventResponseHours: computeInfoSecEventResponseHoursV13(records),
        dataBackupSuccessRate: computeDataBackupSuccessRateV13(records),
        systemVulnFixTimelyRate: computeSystemVulnFixTimelyRateV13(records),
      }));
    },
  },
];
