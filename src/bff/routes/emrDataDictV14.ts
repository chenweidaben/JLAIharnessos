/**
 * 健澜科技 jlmedaios - 病历质控数据字典管理 V14 路由（M473-A）
 *
 * GET  /api/v1/emr-data-dict  （read，auth:true，query 用 new URL 取 keyword/category）返回字典列表
 * POST /api/v1/emr-data-dict  （auth:true，body 用 await c.req.json()）新增字典项
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDataDict,
  searchDictItems,
  type DataDictV14,
} from "../aggregators/emrDataDictV14Aggregator.js";

const demoItems: DataDictV14[] = [
  { id: "DD-001", category: "病历类型", code: "EMR001", label: "入院记录" },
  { id: "DD-002", category: "病历类型", code: "EMR002", label: "出院小结" },
  { id: "DD-003", category: "缺陷等级", code: "D01", label: "关键缺陷" },
];

export const emrDataDictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-data-dict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-data-dict:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const keyword = url.searchParams.get("keyword") ?? "";
      const category = url.searchParams.get("category") ?? "";
      let items = demoItems;
      if (category) items = items.filter((i) => i.category === category);
      items = searchDictItems(items, keyword);
      return json(ok({ items, total: items.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-data-dict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-data-dict:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        category?: string;
        code?: string;
        label?: string;
      };
      const item = buildDataDict(
        body.category ?? "",
        body.code ?? "",
        body.label ?? "",
      );
      return json(ok({ item }));
    },
  },
];
