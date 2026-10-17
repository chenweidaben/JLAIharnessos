/**
 * 健澜科技 jlmedaios - 消毒供应 V13 路由（M351-A）
 *
 * GET /api/v1/cssd
 *
 * 权限：cssd:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBioMonitorPassRateV13,
  computeSterilizedPackageCountV13,
  computeWetPackageRateV13,
  type CssdRecordV13,
} from "../aggregators/cssdV13Aggregator.js";

const records: CssdRecordV13[] = [
  { sterilizedPackageCount: 500, wetPackageCount: 2, bioMonitorCount: 100, bioMonitorPassedCount: 98 },
  { sterilizedPackageCount: 500, wetPackageCount: 3, bioMonitorCount: 100, bioMonitorPassedCount: 99 },
];

export const cssdV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cssd",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cssd:read");
      if (denied) return denied;
      return json(ok({
        sterilizedPackageCount: computeSterilizedPackageCountV13(records),
        wetPackageRate: computeWetPackageRateV13(records),
        bioMonitorPassRate: computeBioMonitorPassRateV13(records),
      }));
    },
  },
];
