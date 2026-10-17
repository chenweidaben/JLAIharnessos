/**
 * 健澜科技 jlmedaios - 重点专科建设 V13 路由（M355-A）
 *
 * GET /api/v1/specialty-development
 *
 * 权限：specialty-development:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMunicipalSpecialtyCountV13,
  computeNationalSpecialtyCountV13,
  computeProvincialSpecialtyCountV13,
  type SpecialtyDevelopmentRecordV13,
} from "../aggregators/specialtyDevelopmentV13Aggregator.js";

const records: SpecialtyDevelopmentRecordV13[] = [
  { nationalSpecialtyCount: 1, provincialSpecialtyCount: 2, municipalSpecialtyCount: 3 },
  { nationalSpecialtyCount: 2, provincialSpecialtyCount: 3, municipalSpecialtyCount: 4 },
];

export const specialtyDevelopmentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/specialty-development",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "specialty-development:read");
      if (denied) return denied;
      return json(ok({
        nationalSpecialtyCount: computeNationalSpecialtyCountV13(records),
        provincialSpecialtyCount: computeProvincialSpecialtyCountV13(records),
        municipalSpecialtyCount: computeMunicipalSpecialtyCountV13(records),
      }));
    },
  },
];
