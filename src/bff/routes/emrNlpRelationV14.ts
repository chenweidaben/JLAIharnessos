/**
 * 健澜科技 jlmedaios - NLP 病历关系抽取 V14 路由（M490-B）
 *
 * POST /api/v1/emr-nlp-relation  （auth:true，body 用 await c.req.json()）返回关系抽取结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { extractMedicalRelations, buildRelationReport } from "../aggregators/emrNlpRelationV14Aggregator.js";

export const emrNlpRelationV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-relation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-relation:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = extractMedicalRelations(content);
      const report = buildRelationReport(result);
      return json(ok({ result, report }));
    },
  },
];
