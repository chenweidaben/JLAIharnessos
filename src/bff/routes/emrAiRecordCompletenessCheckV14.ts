/**
 * 健澜科技 jlmedaios - 病历AI病历完整性检查 V14 路由（M553-B）
 *
 * GET  /api/v1/emr-ai-record-completeness-check  （read，auth:true）返回 AI 病历完整性检查基础数据
 * POST /api/v1/emr-ai-record-completeness-check  （auth:true）AI 病历完整性检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRecordCompletenessCheck,
  buildAiRecordCompletenessCheckReport,
  checkRecordCompletenessByAi,
  type AiRecordCompletenessCheckInputV14,
} from "../aggregators/emrAiRecordCompletenessCheckV14Aggregator.js";

export const emrAiRecordCompletenessCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-record-completeness-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-completeness-check:read");
      if (denied) return denied;
      const base = buildAiRecordCompletenessCheck("RECB034", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-record-completeness-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-completeness-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRecordCompletenessCheckInputV14 = {
        hasChiefComplaint: Boolean(obj?.hasChiefComplaint ?? false),
        hasPresentIllness: Boolean(obj?.hasPresentIllness ?? false),
        hasPastHistory: Boolean(obj?.hasPastHistory ?? false),
        hasPhysicalExam: Boolean(obj?.hasPhysicalExam ?? false),
      };
      const result = checkRecordCompletenessByAi(input);
      const report = buildAiRecordCompletenessCheckReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
