/**
 * 健澜科技 jlmedaios - 病历诊断自动提取 V14 路由（M529-C）
 *
 * GET  /api/v1/emr-diagnosis-nlp  （read，auth:true）返回诊断提取基础数据
 * POST /api/v1/emr-diagnosis-nlp  （auth:true）诊断自动提取 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDiagnosisNlp,
  buildDiagnosisNlpReport,
  extractDiagnosisStruct,
  type DiagnosisNlpInputV14,
} from "../aggregators/emrDiagnosisNlpV14Aggregator.js";

export const emrDiagnosisNlpV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-diagnosis-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-diagnosis-nlp:read");
      if (denied) return denied;
      const nlp = buildDiagnosisNlp("REC062", "心内科");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-diagnosis-nlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-diagnosis-nlp:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: DiagnosisNlpInputV14 = {
        rawText: String(body?.rawText ?? ""),
      };
      const result = extractDiagnosisStruct(input);
      const report = buildDiagnosisNlpReport({
        diagnosisCount: result.diagnosisCount,
        topDiagnosis: result.diagnosisList[0] ?? "",
      });
      return json(ok({ input, result, report }));
    },
  },
];
