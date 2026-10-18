/**
 * 健澜科技 jlmedaios - 质控系统参数配置 V14 路由（M498-A）
 *
 * GET /api/v1/emr-qc-sys-param  （read，auth:true）返回系统参数列表
 * POST /api/v1/emr-qc-sys-param  （auth:true，body 用 await c.req.json()）提交系统参数
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSysParam, validateSysParam } from "../aggregators/emrQcSysParamV14Aggregator.js";

const sampleParams = [
  buildSysParam("maxDefectThreshold", "5"),
  buildSysParam("autoArchiveDays", "90"),
  buildSysParam("alertEmailEnabled", "true"),
];

export const emrQcSysParamV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-sys-param",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-sys-param:read");
      if (denied) return denied;
      return json(ok({ params: sampleParams }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-sys-param",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-sys-param:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        key?: string;
        value?: string;
      };
      const param = buildSysParam(body.key ?? "", body.value ?? "");
      const validation = validateSysParam(param);
      return json(ok({ param, validation }));
    },
  },
];
