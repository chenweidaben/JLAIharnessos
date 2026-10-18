/**
 * 健澜科技 jlmedaios - 病历结构化录入辅助 V14 路由（M539-B）
 *
 * GET  /api/v1/emr-structured-input  （read，auth:true）返回结构化录入基础数据
 * POST /api/v1/emr-structured-input  （auth:true）录入辅助 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStructuredInput,
  buildStructuredInputReport,
  assistStructuredInput,
  type StructuredInputInputV14,
} from "../aggregators/emrStructuredInputV14Aggregator.js";

export const emrStructuredInputV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-structured-input",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-structured-input:read");
      if (denied) return denied;
      const base = buildStructuredInput("REC601", "主诉");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-structured-input",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-structured-input:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: StructuredInputInputV14 = {
        rawText: String(obj?.rawText ?? ""),
        fieldType: String(obj?.fieldType ?? ""),
      };
      const result = assistStructuredInput(input);
      const report = buildStructuredInputReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
