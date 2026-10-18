/**
 * 健澜科技 jlmedaios - 质控指标钻取 V14 路由（M484-C）
 *
 * GET /api/v1/emr-qc-metric-drilldown  （read，auth:true，query 用 new URL 取 dept）返回钻取明细
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDrilldown, filterByDimension, type DimensionItemV14 } from "../aggregators/emrQcMetricDrilldownV14Aggregator.js";

const demoDimensions: DimensionItemV14[] = [
  { dept: "内科", value: 95 },
  { dept: "外科", value: 85 },
  { dept: "儿科", value: 90 },
];

const demoDrilldown = buildDrilldown("完整率", demoDimensions);

export const emrQcMetricDrilldownV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-metric-drilldown",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-drilldown:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept");
      const dimensions = dept ? filterByDimension(demoDimensions, dept) : demoDimensions;
      return json(ok({ drilldown: demoDrilldown, dimensions }));
    },
  },
];
