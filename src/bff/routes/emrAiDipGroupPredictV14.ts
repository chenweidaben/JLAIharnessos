/**
 * 健澜科技 jlmedaios - 病历AI DIP 分组预测 V14 路由（M552-B）
 *
 * GET  /api/v1/emr-ai-dip-group-predict  （read，auth:true）返回 AI DIP 分组预测基础数据
 * POST /api/v1/emr-ai-dip-group-predict  （auth:true）AI DIP 分组预测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDipGroupPredict,
  buildAiDipGroupPredictReport,
  predictDipGroupByAi,
  type AiDipGroupPredictInputV14,
} from "../aggregators/emrAiDipGroupPredictV14Aggregator.js";

export const emrAiDipGroupPredictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-dip-group-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-dip-group-predict:read");
      if (denied) return denied;
      const base = buildAiDipGroupPredict("RECB030", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-dip-group-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-dip-group-predict:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDipGroupPredictInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        cost: Number(obj?.cost ?? 0),
      };
      const result = predictDipGroupByAi(input);
      const report = buildAiDipGroupPredictReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
