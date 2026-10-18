/**
 * 健澜科技 jlmedaios - 病历 NLP 否定检测 V14 路由（M531-D，M531 收官）
 *
 * GET  /api/v1/emr-nlp-negation-detect  （read，auth:true）返回否定检测基础数据
 * POST /api/v1/emr-nlp-negation-detect  （auth:true）否定检测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNlpNegationDetect,
  buildNlpNegationDetectReport,
  detectNegationScope,
  type NlpNegationDetectInputV14,
} from "../aggregators/emrNlpNegationDetectV14Aggregator.js";

export const emrNlpNegationDetectV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-nlp-negation-detect",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-negation-detect:read");
      if (denied) return denied;
      const nlp = buildNlpNegationDetect("REC081", "呼吸科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-nlp-negation-detect",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-negation-detect:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: NlpNegationDetectInputV14 = {
        sentence: String(obj?.sentence ?? ""),
        target: String(obj?.target ?? ""),
      };
      const result = detectNegationScope(input);
      const report = buildNlpNegationDetectReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
