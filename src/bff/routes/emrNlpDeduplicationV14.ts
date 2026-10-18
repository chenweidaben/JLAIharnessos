/**
 * 健澜科技 jlmedaios - NLP 病历去重 V14 路由（M491-C）
 *
 * POST /api/v1/emr-nlp-deduplication  （auth:true，body 用 await c.req.json()）返回去重结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { deduplicateMedicalRecords, buildDedupReport } from "../aggregators/emrNlpDeduplicationV14Aggregator.js";

export const emrNlpDeduplicationV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-deduplication",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-deduplication:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        records?: { id: string; content: string }[];
      };
      const records = body.records ?? [];
      const result = deduplicateMedicalRecords(records);
      const report = buildDedupReport(result, records.length);
      return json(ok({ result, report }));
    },
  },
];
