/**
 * 健澜科技 jlmedaios - 数据安全管理 V13 路由（M446-B，信息化建设与数据安全管理组）
 *
 * GET /api/v1/data-security-mgmt
 *
 * 权限：data-security-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataSecurityClassificationCoverageRateV13,
  computeDataSecurityIncidentCountV13,
  computeDataSecurityMaskingRateV13,
  type DataSecurityMgmtRecordV13,
} from "../aggregators/dataSecurityMgmtV13Aggregator.js";

const records: DataSecurityMgmtRecordV13[] = [
  { classified: 950, totalAssets: 1000, masked: 900, totalSensitive: 1000, securityIncident: true },
  { classified: 950, totalAssets: 1000, masked: 900, totalSensitive: 1000, securityIncident: true },
];

export const dataSecurityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-security-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-security-mgmt:read");
      if (denied) return denied;
      return json(ok({
        dataSecurityClassificationCoverageRate: computeDataSecurityClassificationCoverageRateV13(records),
        dataSecurityMaskingRate: computeDataSecurityMaskingRateV13(records),
        dataSecurityIncidentCount: computeDataSecurityIncidentCountV13(records),
      }));
    },
  },
];
