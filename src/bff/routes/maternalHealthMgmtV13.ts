/**
 * 健澜科技 jlmedaios - 孕产妇系统管理 V13 路由（M442-A，妇幼健康与计划生育管理组）
 *
 * GET /api/v1/maternal-health-mgmt
 *
 * 权限：maternal-health-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMaternalHealthPostnatalVisitRateV13,
  computeMaternalHealthRecordRateV13,
  computeMaternalHealthSystemRateV13,
  type MaternalHealthMgmtRecordV13,
} from "../aggregators/maternalHealthMgmtV13Aggregator.js";

const records: MaternalHealthMgmtRecordV13[] = [
  { registeredMaternal: 950, totalMaternal: 1000, systemManaged: 900, visitedPostnatal: 980, shouldVisitPostnatal: 1000 },
  { registeredMaternal: 950, totalMaternal: 1000, systemManaged: 900, visitedPostnatal: 980, shouldVisitPostnatal: 1000 },
];

export const maternalHealthMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/maternal-health-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "maternal-health-mgmt:read");
      if (denied) return denied;
      return json(ok({
        maternalHealthRecordRate: computeMaternalHealthRecordRateV13(records),
        maternalHealthSystemRate: computeMaternalHealthSystemRateV13(records),
        maternalHealthPostnatalVisitRate: computeMaternalHealthPostnatalVisitRateV13(records),
      }));
    },
  },
];
