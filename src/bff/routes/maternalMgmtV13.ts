/**
 * 健澜科技 jlmedaios - 孕产妇管理 V13 路由（M412-C）
 *
 * GET /api/v1/maternal-mgmt
 *
 * 权限：maternal-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCesareanSectionRateV13,
  computeMaternalSystemMgmtRateV13,
  computePostpartumVisitRateV13,
  type MaternalMgmtRecordV13,
} from "../aggregators/maternalMgmtV13Aggregator.js";

const records: MaternalMgmtRecordV13[] = [
  { systemManaged: 950, maternalTotal: 1000, visited: 980, postpartumTotal: 1000, cesarean: 300, deliveryTotal: 1000 },
  { systemManaged: 950, maternalTotal: 1000, visited: 980, postpartumTotal: 1000, cesarean: 300, deliveryTotal: 1000 },
];

export const maternalMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/maternal-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "maternal-mgmt:read");
      if (denied) return denied;
      return json(ok({
        maternalSystemMgmtRate: computeMaternalSystemMgmtRateV13(records),
        postpartumVisitRate: computePostpartumVisitRateV13(records),
        cesareanSectionRate: computeCesareanSectionRateV13(records),
      }));
    },
  },
];
