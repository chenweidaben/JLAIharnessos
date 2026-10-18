/**
 * 健澜科技 jlmedaios - 病历质控指标字典管理 V14 路由（M472-A 新规格）
 *
 * GET  /api/v1/emr-indicator-dict  （read，auth:true，query 用 new URL 取 keyword）返回指标字典列表
 * POST /api/v1/emr-indicator-dict  （auth:true，body 用 await c.req.json()）新增指标
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildIndicatorDict,
  searchIndicators,
  type IndicatorDictV14,
} from "../aggregators/emrIndicatorDictV14Aggregator.js";

const demoItems: IndicatorDictV14[] = [
  { id: "IND-001", name: "通过率", unit: "%", direction: "higher" },
  { id: "IND-002", name: "缺陷率", unit: "‰", direction: "lower" },
  { id: "IND-003", name: "归档率", unit: "%", direction: "higher" },
];

export const emrIndicatorDictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-indicator-dict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-indicator-dict:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const keyword = url.searchParams.get("keyword") ?? "";
      const items = searchIndicators(demoItems, keyword);
      return json(ok({ items, total: items.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-indicator-dict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-indicator-dict:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        name?: string;
        unit?: string;
        direction?: IndicatorDictV14["direction"];
      };
      const item = buildIndicatorDict(
        body.name ?? "",
        body.unit ?? "",
        body.direction ?? "higher",
      );
      return json(ok({ item }));
    },
  },
];
