/**
 * 健澜科技 jlmedaios - 病历既往史 NLP 提取 V14 路由（M530-A）
 *
 * GET  /api/v1/emr-past-history-nlp  （read，auth:true）返回既往史提取基础数据
 * POST /api/v1/emr-past-history-nlp  （auth:true）既往史结构化提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPastHistoryNlp,
  buildPastHistoryNlpReport,
  extractPastHistoryStruct,
  type PastHistoryNlpInputV14,
} from "../aggregators/emrPastHistoryNlpV14Aggregator.js";

export const emrPastHistoryNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-past-history-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-past-history-nlp:read");
      if (denied) return denied;
      const nlp = buildPastHistoryNlp("REC070", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-past-history-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-past-history-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: PastHistoryNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractPastHistoryStruct(input);
      const report = buildPastHistoryNlpReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
