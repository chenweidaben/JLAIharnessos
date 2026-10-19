/**
 * 健澜科技 jlmedaios - 病历AI病案缺陷预警 V14 路由（M556-C）
 *
 * GET  /api/v1/emr-ai-record-defect-alert  （read，auth:true）返回 AI 病案缺陷预警基础数据
 * POST /api/v1/emr-ai-record-defect-alert  （auth:true）AI 病案缺陷预警 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRecordDefectAlert,
  buildAiRecordDefectAlertReport,
  alertRecordDefectByAi,
  type AiRecordDefectAlertInputV14,
} from "../aggregators/emrAiRecordDefectAlertV14Aggregator.js";

export const emrAiRecordDefectAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-record-defect-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-defect-alert:read");
      if (denied) return denied;
      const base = buildAiRecordDefectAlert("RECB047", "病案室");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-record-defect-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-defect-alert:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRecordDefectAlertInputV14 = {
        hasMissingDiagnosis: Boolean(obj?.hasMissingDiagnosis ?? false),
        hasMissingSurgeon: Boolean(obj?.hasMissingSurgeon ?? false),
        hasMissingOpDate: Boolean(obj?.hasMissingOpDate ?? false),
        hasMissingDischargeReason: Boolean(obj?.hasMissingDischargeReason ?? false),
      };
      const result = alertRecordDefectByAi(input);
      const report = buildAiRecordDefectAlertReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
