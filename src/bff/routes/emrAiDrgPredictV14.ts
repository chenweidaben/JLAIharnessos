/**
 * 健澜科技 jlmedaios - 病历AI DRG分组预测 V14 路由（M544-D，M544 收官）
 *
 * GET  /api/v1/emr-ai-drg-predict  （read，auth:true）返回 AI DRG 预测基础数据
 * POST /api/v1/emr-ai-drg-predict  （auth:true）AI DRG 分组预测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDrgPredict,
  buildAiDrgPredictReport,
  predictDrgByAi,
  type AiDrgPredictInputV14,
} from "../aggregators/emrAiDrgPredictV14Aggregator.js";

export const emrAiDrgPredictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-drg-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drg-predict:read");
      if (denied) return denied;
      const base = buildAiDrgPredict("RECA004", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-drg-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drg-predict:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDrgPredictInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        hasSurgery: Boolean(obj?.hasSurgery ?? false),
      };
      const result = predictDrgByAi(input);
      const report = buildAiDrgPredictReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
