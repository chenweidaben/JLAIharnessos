/**
 * 健澜科技 jlmedaios - 病历AI DRG 分组预测 V14 路由（M552-A）
 *
 * GET  /api/v1/emr-ai-drg-group-predict  （read，auth:true）返回 AI DRG 分组预测基础数据
 * POST /api/v1/emr-ai-drg-group-predict  （auth:true）AI DRG 分组预测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDrgGroupPredict,
  buildAiDrgGroupPredictReport,
  predictDrgGroupByAi,
  type AiDrgGroupPredictInputV14,
} from "../aggregators/emrAiDrgGroupPredictV14Aggregator.js";

export const emrAiDrgGroupPredictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-drg-group-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drg-group-predict:read");
      if (denied) return denied;
      const base = buildAiDrgGroupPredict("RECB029", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-drg-group-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-drg-group-predict:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDrgGroupPredictInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        hasSurgery: Boolean(obj?.hasSurgery ?? false),
      };
      const result = predictDrgGroupByAi(input);
      const report = buildAiDrgGroupPredictReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
