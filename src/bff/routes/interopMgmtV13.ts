/**
 * 健澜科技 jlmedaios - 互联互通管理 V13 路由（M409-D，M409 收官）
 *
 * GET /api/v1/interop-mgmt
 *
 * 权限：interop-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataSharingExchangeRateV13,
  computeInterfaceStandardizationRateV13,
  computeInteropMaturityLevelV13,
  type InteropMgmtRecordV13,
} from "../aggregators/interopMgmtV13Aggregator.js";

const records: InteropMgmtRecordV13[] = [
  { level: 4, standardized: 95, total: 100, shared: 900, should: 1000 },
  { level: 5, standardized: 95, total: 100, shared: 900, should: 1000 },
];

export const interopMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/interop-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "interop-mgmt:read");
      if (denied) return denied;
      return json(ok({
        interopMaturityLevel: computeInteropMaturityLevelV13(records),
        interfaceStandardizationRate: computeInterfaceStandardizationRateV13(records),
        dataSharingExchangeRate: computeDataSharingExchangeRateV13(records),
      }));
    },
  },
];
