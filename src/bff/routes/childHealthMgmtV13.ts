/**
 * 健澜科技 jlmedaios - 儿童保健管理 V13 路由（M442-B，妇幼健康与计划生育管理组）
 *
 * GET /api/v1/child-health-mgmt
 *
 * 权限：child-health-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeChildHealthGrowthMonitoringRateV13,
  computeChildHealthManagementRateV13,
  computeChildHealthNewbornVisitRateV13,
  type ChildHealthMgmtRecordV13,
} from "../aggregators/childHealthMgmtV13Aggregator.js";

const records: ChildHealthMgmtRecordV13[] = [
  { managedChild: 950, totalChild: 1000, visitedNewborn: 980, totalNewborn: 1000, monitoredChild: 900, shouldMonitorChild: 1000 },
  { managedChild: 950, totalChild: 1000, visitedNewborn: 980, totalNewborn: 1000, monitoredChild: 900, shouldMonitorChild: 1000 },
];

export const childHealthMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/child-health-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "child-health-mgmt:read");
      if (denied) return denied;
      return json(ok({
        childHealthManagementRate: computeChildHealthManagementRateV13(records),
        childHealthNewbornVisitRate: computeChildHealthNewbornVisitRateV13(records),
        childHealthGrowthMonitoringRate: computeChildHealthGrowthMonitoringRateV13(records),
      }));
    },
  },
];
