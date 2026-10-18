/**
 * 健澜科技 jlmedaios - 病历现病史结构化提取 V14 路由（M529-B）
 *
 * GET  /api/v1/emr-hpi-nlp  （read，auth:true）返回现病史提取基础数据
 * POST /api/v1/emr-hpi-nlp  （auth:true）现病史结构化提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHpiNlp,
  buildHpiNlpReport,
  extractHpiStruct,
  type HpiNlpInputV14,
} from "../aggregators/emrHpiNlpV14Aggregator.js";

export const emrHpiNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-hpi-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-hpi-nlp:read");
      if (denied) return denied;
      const nlp = buildHpiNlp("REC061", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-hpi-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-hpi-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: HpiNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractHpiStruct(input);
      const report = buildHpiNlpReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
