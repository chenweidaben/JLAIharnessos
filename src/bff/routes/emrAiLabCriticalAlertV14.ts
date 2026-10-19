/**
 * 健澜科技 jlmedaios - 病历AI检验危急值智能提醒 V14 路由（M561-D，M561 收官）
 *
 * GET  /api/v1/emr-ai-lab-critical-alert  （read，auth:true）返回 AI 检验危急值智能提醒基础数据
 * POST /api/v1/emr-ai-lab-critical-alert  （auth:true）AI 检验危急值智能提醒 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiLabCriticalAlert,
  buildAiLabCriticalAlertReport,
  alertLabCriticalByAi,
  type AiLabCriticalAlertInputV14,
} from "../aggregators/emrAiLabCriticalAlertV14Aggregator.js";

export const emrAiLabCriticalAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-lab-critical-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-critical-alert:read");
      if (denied) return denied;
      const base = buildAiLabCriticalAlert("RECB069", "检验科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-lab-critical-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-critical-alert:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiLabCriticalAlertInputV14 = {
        testName: String(obj?.testName ?? ""),
        value: Number(obj?.value ?? 0),
        lowLimit: Number(obj?.lowLimit ?? 0),
        highLimit: Number(obj?.highLimit ?? 0),
      };
      const result = alertLabCriticalByAi(input);
      const report = buildAiLabCriticalAlertReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
