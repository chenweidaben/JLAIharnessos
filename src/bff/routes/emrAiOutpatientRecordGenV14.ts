/**
 * 健澜科技 jlmedaios - 病历AI门诊病历智能生成 V14 路由（M558-A）
 *
 * GET  /api/v1/emr-ai-outpatient-record-gen  （read，auth:true）返回 AI 门诊病历智能生成基础数据
 * POST /api/v1/emr-ai-outpatient-record-gen  （auth:true）AI 门诊病历智能生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOutpatientRecordGen,
  buildAiOutpatientRecordGenReport,
  genOutpatientRecordByAi,
  type AiOutpatientRecordGenInputV14,
} from "../aggregators/emrAiOutpatientRecordGenV14Aggregator.js";

export const emrAiOutpatientRecordGenV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-outpatient-record-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-outpatient-record-gen:read");
      if (denied) return denied;
      const base = buildAiOutpatientRecordGen("RECB053", "门诊办公室");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-outpatient-record-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-outpatient-record-gen:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOutpatientRecordGenInputV14 = {
        patientName: String(obj?.patientName ?? ""),
        symptom: String(obj?.symptom ?? ""),
        diagnosis: String(obj?.diagnosis ?? ""),
      };
      const result = genOutpatientRecordByAi(input);
      const report = buildAiOutpatientRecordGenReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
