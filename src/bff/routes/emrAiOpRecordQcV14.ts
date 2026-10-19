/**
 * 健澜科技 jlmedaios - 病历AI手术记录质控 V14 路由（M555-B）
 *
 * GET  /api/v1/emr-ai-op-record-qc  （read，auth:true）返回 AI 手术记录质控基础数据
 * POST /api/v1/emr-ai-op-record-qc  （auth:true）AI 手术记录质控 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOpRecordQc,
  buildAiOpRecordQcReport,
  checkOpRecordQcByAi,
  type AiOpRecordQcInputV14,
} from "../aggregators/emrAiOpRecordQcV14Aggregator.js";

export const emrAiOpRecordQcV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-op-record-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-op-record-qc:read");
      if (denied) return denied;
      const base = buildAiOpRecordQc("RECB042", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-op-record-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-op-record-qc:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOpRecordQcInputV14 = {
        hasOpName: Boolean(obj?.hasOpName ?? false),
        hasOpDate: Boolean(obj?.hasOpDate ?? false),
        hasSurgeon: Boolean(obj?.hasSurgeon ?? false),
        hasAnesthesia: Boolean(obj?.hasAnesthesia ?? false),
        hasOpFindings: Boolean(obj?.hasOpFindings ?? false),
      };
      const result = checkOpRecordQcByAi(input);
      const report = buildAiOpRecordQcReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
