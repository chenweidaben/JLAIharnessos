/**
 * 健澜科技 jlmedaios - 病历AI用药错误预警 V14 路由（M559-B）
 *
 * GET  /api/v1/emr-ai-medication-error-alert  （read，auth:true）返回 AI 用药错误预警基础数据
 * POST /api/v1/emr-ai-medication-error-alert  （auth:true）AI 用药错误预警 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiMedicationErrorAlert,
  buildAiMedicationErrorAlertReport,
  alertMedicationErrorByAi,
  type AiMedicationErrorAlertInputV14,
} from "../aggregators/emrAiMedicationErrorAlertV14Aggregator.js";

export const emrAiMedicationErrorAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-medication-error-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-medication-error-alert:read");
      if (denied) return denied;
      const base = buildAiMedicationErrorAlert("RECB059", "药剂科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-medication-error-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-medication-error-alert:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiMedicationErrorAlertInputV14 = {
        drugName: String(obj?.drugName ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
        hasAllergy: Boolean(obj?.hasAllergy ?? false),
      };
      const result = alertMedicationErrorByAi(input);
      const report = buildAiMedicationErrorAlertReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
