/**
 * 健澜科技 jlmedaios - 病历AI病历逻辑一致性检查 V14 路由（M553-C）
 *
 * GET  /api/v1/emr-ai-record-consistency-check  （read，auth:true）返回 AI 病历逻辑一致性检查基础数据
 * POST /api/v1/emr-ai-record-consistency-check  （auth:true）AI 病历逻辑一致性检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRecordConsistencyCheck,
  buildAiRecordConsistencyCheckReport,
  checkRecordConsistencyByAi,
  type AiRecordConsistencyCheckInputV14,
} from "../aggregators/emrAiRecordConsistencyCheckV14Aggregator.js";

export const emrAiRecordConsistencyCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-record-consistency-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-consistency-check:read");
      if (denied) return denied;
      const base = buildAiRecordConsistencyCheck("RECB035", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-record-consistency-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-consistency-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRecordConsistencyCheckInputV14 = {
        admissionDiagnosis: String(obj?.admissionDiagnosis ?? ""),
        dischargeDiagnosis: String(obj?.dischargeDiagnosis ?? ""),
      };
      const result = checkRecordConsistencyByAi(input);
      const report = buildAiRecordConsistencyCheckReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
