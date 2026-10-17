/**
 * 健澜科技 jlmedaios - 新生儿管理 V13 路由（M412-B）
 *
 * GET /api/v1/newborn-mgmt
 *
 * 权限：newborn-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNewbornApgarPassRateV13,
  computeNewbornAsphyxiaRateV13,
  computeNewbornVisitRateV13,
  type NewbornMgmtRecordV13,
} from "../aggregators/newbornMgmtV13Aggregator.js";

const records: NewbornMgmtRecordV13[] = [
  { apgarPass: 980, visited: 950, asphyxia: 15, newbornTotal: 1000 },
  { apgarPass: 980, visited: 950, asphyxia: 15, newbornTotal: 1000 },
];

export const newbornMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/newborn-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "newborn-mgmt:read");
      if (denied) return denied;
      return json(ok({
        newbornApgarPassRate: computeNewbornApgarPassRateV13(records),
        newbornVisitRate: computeNewbornVisitRateV13(records),
        newbornAsphyxiaRate: computeNewbornAsphyxiaRateV13(records),
      }));
    },
  },
];
