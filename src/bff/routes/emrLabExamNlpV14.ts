/**
 * 健澜科技 jlmedaios - 病历辅助检查 NLP 提取 V14 路由（M530-D，M530 收官）
 *
 * GET  /api/v1/emr-lab-exam-nlp  （read，auth:true）返回辅助检查提取基础数据
 * POST /api/v1/emr-lab-exam-nlp  （auth:true）辅助检查结构化提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildLabExamNlp,
  buildLabExamNlpReport,
  extractLabExamStruct,
  type LabExamNlpInputV14,
} from "../aggregators/emrLabExamNlpV14Aggregator.js";

export const emrLabExamNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-lab-exam-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-lab-exam-nlp:read");
      if (denied) return denied;
      const nlp = buildLabExamNlp("REC073", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-lab-exam-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-lab-exam-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: LabExamNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractLabExamStruct(input);
      const report = buildLabExamNlpReport({
        abnormalCount: result.abnormalCount,
        examTotal: result.examItems.length,
      });
      return json(ok({ input, result, report }));
    },
  },
];
