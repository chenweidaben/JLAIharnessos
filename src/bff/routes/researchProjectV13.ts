/**
 * 健澜科技 jlmedaios - 科研项目 V13 路由（M343-C）
 *
 * GET /api/v1/research-project
 *
 * 权限：research-project:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMunicipalCountV13,
  computeNationalCountV13,
  computeProvincialCountV13,
  type ResearchProjectRecordV13,
} from "../aggregators/researchProjectV13Aggregator.js";

const records: ResearchProjectRecordV13[] = [
  { nationalCount: 2, provincialCount: 5, municipalCount: 10 },
  { nationalCount: 3, provincialCount: 5, municipalCount: 10 },
];

export const researchProjectV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-project",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-project:read");
      if (denied) return denied;
      return json(ok({
        nationalCount: computeNationalCountV13(records),
        provincialCount: computeProvincialCountV13(records),
        municipalCount: computeMunicipalCountV13(records),
      }));
    },
  },
];
