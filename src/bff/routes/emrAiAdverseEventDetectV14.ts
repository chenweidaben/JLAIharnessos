/**
 * 健澜科技 jlmedaios - 病历AI不良事件主动识别 V14 路由（M559-A）
 *
 * GET  /api/v1/emr-ai-adverse-event-detect  （read，auth:true）返回 AI 不良事件主动识别基础数据
 * POST /api/v1/emr-ai-adverse-event-detect  （auth:true）AI 不良事件主动识别 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiAdverseEventDetect,
  buildAiAdverseEventDetectReport,
  detectAdverseEventByAi,
  type AiAdverseEventDetectInputV14,
} from "../aggregators/emrAiAdverseEventDetectV14Aggregator.js";

export const emrAiAdverseEventDetectV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-adverse-event-detect",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-adverse-event-detect:read");
      if (denied) return denied;
      const base = buildAiAdverseEventDetect("RECB058", "护理部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-adverse-event-detect",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-adverse-event-detect:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiAdverseEventDetectInputV14 = {
        hasFall: Boolean(obj?.hasFall ?? false),
        hasPressureUlcer: Boolean(obj?.hasPressureUlcer ?? false),
        hasMedError: Boolean(obj?.hasMedError ?? false),
        hasInfection: Boolean(obj?.hasInfection ?? false),
      };
      const result = detectAdverseEventByAi(input);
      const report = buildAiAdverseEventDetectReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
