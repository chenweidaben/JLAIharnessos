/**
 * 健澜科技 jlmedaios - 模板效果评估 V14 路由（M525-D，M525 收官）
 *
 * GET  /api/v1/emr-template-effect-eval  （read，auth:true）返回效果评估基础数据
 * POST /api/v1/emr-template-effect-eval  （auth:true）效果评估 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEffectEval,
  buildEffectEvalReport,
  evaluateTemplateEffect,
  type EffectEvalInputV14,
} from "../aggregators/emrTemplateEffectEvalV14Aggregator.js";

export const emrTemplateEffectEvalV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-effect-eval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-effect-eval:read");
      if (denied) return denied;
      const evalData = buildEffectEval("入院记录模板v3.0", "2026-Q3");
      return json(ok(evalData));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-effect-eval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-effect-eval:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: EffectEvalInputV14 = {
        completionRate: Number(body?.completionRate ?? 0),
        satisfactionRate: Number(body?.satisfactionRate ?? 0),
        defectReduction: Number(body?.defectReduction ?? 0),
      };
      const result = evaluateTemplateEffect(input);
      const report = buildEffectEvalReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
