/**
 * 健澜科技 jlmedaios - NLP 病历实体识别 V14 路由（M490-A）
 *
 * POST /api/v1/emr-nlp-entity  （auth:true，body 用 await c.req.json()）返回实体识别结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { extractMedicalEntities, buildEntityReport } from "../aggregators/emrNlpEntityV14Aggregator.js";

export const emrNlpEntityV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-entity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-entity:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = extractMedicalEntities(content);
      const report = buildEntityReport(result);
      return json(ok({ result, report }));
    },
  },
];
