/**
 * 健澜科技 jlmedaios - 病历体格检查 NLP 提取 V14 路由（M530-C）
 *
 * GET  /api/v1/emr-physical-exam-nlp  （read，auth:true）返回体格检查提取基础数据
 * POST /api/v1/emr-physical-exam-nlp  （auth:true）体格检查结构化提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPhysicalExamNlp,
  buildPhysicalExamNlpReport,
  extractPhysicalExamStruct,
  type PhysicalExamNlpInputV14,
} from "../aggregators/emrPhysicalExamNlpV14Aggregator.js";

export const emrPhysicalExamNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-physical-exam-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-physical-exam-nlp:read");
      if (denied) return denied;
      const nlp = buildPhysicalExamNlp("REC072", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-physical-exam-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-physical-exam-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: PhysicalExamNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractPhysicalExamStruct(input);
      const report = buildPhysicalExamNlpReport({
        vitalSignCount: result.vitalSigns.length,
        hasAbnormal: result.hasAbnormal,
      });
      return json(ok({ input, result, report }));
    },
  },
];
