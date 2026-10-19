/**
 * 健澜科技 jlmedaios - 病历AI院内感染风险预警 V14 路由（M559-C）
 *
 * GET  /api/v1/emr-ai-hai-risk-alert  （read，auth:true）返回 AI 院内感染风险预警基础数据
 * POST /api/v1/emr-ai-hai-risk-alert  （auth:true）AI 院内感染风险预警 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiHaiRiskAlert,
  buildAiHaiRiskAlertReport,
  alertHaiRiskByAi,
  type AiHaiRiskAlertInputV14,
} from "../aggregators/emrAiHaiRiskAlertV14Aggregator.js";

export const emrAiHaiRiskAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-hai-risk-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-hai-risk-alert:read");
      if (denied) return denied;
      const base = buildAiHaiRiskAlert("RECB060", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-hai-risk-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-hai-risk-alert:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiHaiRiskAlertInputV14 = {
        hasSurgery: Boolean(obj?.hasSurgery ?? false),
        hasCatheter: Boolean(obj?.hasCatheter ?? false),
        hasImmunosuppressant: Boolean(obj?.hasImmunosuppressant ?? false),
        hospitalDays: Number(obj?.hospitalDays ?? 0),
      };
      const result = alertHaiRiskByAi(input);
      const report = buildAiHaiRiskAlertReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
