/**
 * 健澜科技 jlmedaios - DRG 入组预测 V14 路由（M535-C）
 *
 * GET  /api/v1/emr-drg-predict  （read，auth:true）返回 DRG 预测基础数据
 * POST /api/v1/emr-drg-predict  （auth:true）DRG 入组预测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDrgPredict,
  buildDrgPredictReport,
  predictDrgGroup,
  type DrgPredictInputV14,
} from "../aggregators/emrDrgPredictV14Aggregator.js";

export const emrDrgPredictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-drg-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-drg-predict:read");
      if (denied) return denied;
      const predict = buildDrgPredict("REC202", "心肌梗死");
      return json(ok(predict));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-drg-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-drg-predict:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: DrgPredictInputV14 = {
        mainDiagnosis: String(obj?.mainDiagnosis ?? ""),
        hasSurgery: Boolean(obj?.hasSurgery ?? false),
        age: Number(obj?.age ?? 0),
      };
      const result = predictDrgGroup(input);
      const report = buildDrgPredictReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
