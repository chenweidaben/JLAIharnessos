/**
 * 健澜科技 jlmedaios - 病历 NLP 时间关系提取 V14 路由（M531-C）
 *
 * GET  /api/v1/emr-nlp-time-relation  （read，auth:true）返回时间关系提取基础数据
 * POST /api/v1/emr-nlp-time-relation  （auth:true）时间关系提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNlpTimeRelation,
  buildNlpTimeRelationReport,
  extractTimeRelation,
  type NlpTimeRelationInputV14,
} from "../aggregators/emrNlpTimeRelationV14Aggregator.js";

export const emrNlpTimeRelationV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-nlp-time-relation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-time-relation:read");
      if (denied) return denied;
      const nlp = buildNlpTimeRelation("REC080", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-nlp-time-relation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-time-relation:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: NlpTimeRelationInputV14 = {
        eventA: String(obj?.eventA ?? ""),
        eventB: String(obj?.eventB ?? ""),
        relationType: (obj?.relationType ?? "同时") as NlpTimeRelationInputV14["relationType"],
      };
      const result = extractTimeRelation(input);
      const report = buildNlpTimeRelationReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
