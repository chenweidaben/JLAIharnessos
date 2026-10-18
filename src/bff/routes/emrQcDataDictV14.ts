/**
 * 健澜科技 jlmedaios - 质控数据字典管理 V14 路由（M498-C）
 *
 * GET /api/v1/emr-qc-data-dict  （read，auth:true）返回数据字典
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDataDict, searchDataDict } from "../aggregators/emrQcDataDictV14Aggregator.js";

const sampleDicts = [
  buildDataDict("缺陷类型", ["缺主诉", "缺现病史", "缺查体"]),
  buildDataDict("科室", ["内科", "外科", "儿科"]),
  buildDataDict("严重等级", ["一般", "较重", "严重"]),
];

export const emrQcDataDictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-data-dict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-data-dict:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const keyword = url.searchParams.get("keyword") ?? "";
      const filtered = keyword ? searchDataDict(sampleDicts, keyword) : sampleDicts;
      return json(ok({ dicts: filtered, total: sampleDicts.length }));
    },
  },
];
