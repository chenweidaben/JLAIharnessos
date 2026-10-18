/**
 * 健澜科技 jlmedaios - 质控系统参数配置明细 V14 路由（M507-A，-detail 避让）
 *
 * GET  /api/v1/emr-qc-sys-param-detail  （read，auth:true）返回参数列表
 * POST /api/v1/emr-qc-sys-param-detail  （auth:true）设置参数
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildParam,
  setParam,
  type SysParamDetailV14,
} from "../aggregators/emrQcSysParamDetailV14Aggregator.js";

let sampleParams: SysParamDetailV14[] = [
  buildParam("qc.autoCheck", "true", "是否自动质控"),
  buildParam("qc.defectThreshold", "5", "缺陷告警阈值"),
];

export const emrQcSysParamDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-sys-param-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-sys-param-detail:read");
      if (denied) return denied;
      return json(ok({ params: sampleParams, total: sampleParams.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-sys-param-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-sys-param-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const key = typeof body?.key === "string" ? body.key : "";
      const value = typeof body?.value === "string" ? body.value : "";
      const desc = typeof body?.desc === "string" ? body.desc : "";
      const param = buildParam(key, value, desc);
      sampleParams = setParam(sampleParams, param);
      return json(ok({ params: sampleParams, total: sampleParams.length }));
    },
  },
];
