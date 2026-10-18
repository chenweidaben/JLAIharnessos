/**
 * 健澜科技 jlmedaios - 质控数据字典管理明细 V14 路由（M507-C，-detail 避让）
 *
 * GET  /api/v1/emr-qc-data-dict-detail  （read，auth:true）返回字典列表
 * POST /api/v1/emr-qc-data-dict-detail  （auth:true）添加字典
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  addDict,
  buildDict,
  type DataDictDetailV14,
} from "../aggregators/emrQcDataDictDetailV14Aggregator.js";

let sampleDicts: DataDictDetailV14[] = [
  buildDict("缺陷等级", "BLOCK", "致命缺陷"),
  buildDict("病历类型", "OUTPATIENT", "门诊病历"),
];

export const emrQcDataDictDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-data-dict-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-data-dict-detail:read");
      if (denied) return denied;
      return json(ok({ dicts: sampleDicts, total: sampleDicts.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-data-dict-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-data-dict-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const type = typeof body?.type === "string" ? body.type : "";
      const code = typeof body?.code === "string" ? body.code : "";
      const label = typeof body?.label === "string" ? body.label : "";
      const dict = buildDict(type, code, label);
      sampleDicts = addDict(sampleDicts, dict);
      return json(ok({ dicts: sampleDicts, total: sampleDicts.length }));
    },
  },
];
