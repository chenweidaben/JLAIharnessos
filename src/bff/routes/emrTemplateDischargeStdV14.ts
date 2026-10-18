/**
 * 健澜科技 jlmedaios - 出院小结模板标准化 V14 路由（M523-D，M523 收官）
 *
 * GET  /api/v1/emr-template-discharge-std  （read，auth:true）返回标准化基础数据
 * POST /api/v1/emr-template-discharge-std  （auth:true）标准化出院模板 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDischargeStd,
  buildDischargeStdReport,
  standardizeDischargeTemplate,
  type DischargeStdInputV14,
} from "../aggregators/emrTemplateDischargeStdV14Aggregator.js";

export const emrTemplateDischargeStdV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-discharge-std",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-discharge-std:read");
      if (denied) return denied;
      const std = buildDischargeStd("心内科", "v4.0");
      return json(ok(std));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-discharge-std",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-discharge-std:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: DischargeStdInputV14 = {
        diagnosis: String(body?.diagnosis ?? ""),
        treatment: String(body?.treatment ?? ""),
        followUp: String(body?.followUp ?? ""),
      };
      const result = standardizeDischargeTemplate(input);
      const report = buildDischargeStdReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
