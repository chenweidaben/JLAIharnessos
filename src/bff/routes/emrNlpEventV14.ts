/**
 * 健澜科技 jlmedaios - NLP 病历事件提取 V14 路由（M490-C）
 *
 * POST /api/v1/emr-nlp-event  （auth:true，body 用 await c.req.json()）返回事件提取结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { extractMedicalEvents, buildEventReport } from "../aggregators/emrNlpEventV14Aggregator.js";

export const emrNlpEventV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-event",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-event:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = extractMedicalEvents(content);
      const report = buildEventReport(result);
      return json(ok({ result, report }));
    },
  },
];
