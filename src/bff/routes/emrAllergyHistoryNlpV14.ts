/**
 * 健澜科技 jlmedaios - 病历过敏史 NLP 提取 V14 路由（M530-B）
 *
 * GET  /api/v1/emr-allergy-history-nlp  （read，auth:true）返回过敏史提取基础数据
 * POST /api/v1/emr-allergy-history-nlp  （auth:true）过敏史结构化提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAllergyHistoryNlp,
  buildAllergyHistoryNlpReport,
  extractAllergyHistoryStruct,
  type AllergyHistoryNlpInputV14,
} from "../aggregators/emrAllergyHistoryNlpV14Aggregator.js";

export const emrAllergyHistoryNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-allergy-history-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-allergy-history-nlp:read");
      if (denied) return denied;
      const nlp = buildAllergyHistoryNlp("REC071", "呼吸科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-allergy-history-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-allergy-history-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: AllergyHistoryNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractAllergyHistoryStruct(input);
      const report = buildAllergyHistoryNlpReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
