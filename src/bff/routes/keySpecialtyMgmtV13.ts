/**
 * 健澜科技 jlmedaios - 重点专科管理 V13 路由（M403-A）
 *
 * GET /api/v1/key-specialty-mgmt
 *
 * 权限：key-specialty-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNationalKeySpecialtyCountV13,
  computeProvincialKeySpecialtyCountV13,
  computeSpecialtyRadiationHospitalCountV13,
  type KeySpecialtyMgmtRecordV13,
} from "../aggregators/keySpecialtyMgmtV13Aggregator.js";

const records: KeySpecialtyMgmtRecordV13[] = [
  { nationalCount: 2, provincialCount: 5, radiationHospitals: 8 },
  { nationalCount: 2, provincialCount: 5, radiationHospitals: 8 },
];

export const keySpecialtyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/key-specialty-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "key-specialty-mgmt:read");
      if (denied) return denied;
      return json(ok({
        nationalKeySpecialtyCount: computeNationalKeySpecialtyCountV13(records),
        provincialKeySpecialtyCount: computeProvincialKeySpecialtyCountV13(records),
        specialtyRadiationHospitalCount: computeSpecialtyRadiationHospitalCountV13(records),
      }));
    },
  },
];
