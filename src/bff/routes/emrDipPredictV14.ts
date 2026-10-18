/**
 * 健澜科技 jlmedaios - DIP 分值预测 V14 路由（M535-D）
 *
 * GET  /api/v1/emr-dip-predict  （read，auth:true）返回 DIP 预测基础数据
 * POST /api/v1/emr-dip-predict  （auth:true）DIP 分值预测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDipPredict,
  buildDipPredictReport,
  predictDipScore,
  type DipPredictInputV14,
} from "../aggregators/emrDipPredictV14Aggregator.js";

export const emrDipPredictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-dip-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-dip-predict:read");
      if (denied) return denied;
      const predict = buildDipPredict("REC203", "肺炎");
      return json(ok(predict));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-dip-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-dip-predict:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: DipPredictInputV14 = {
        mainDiagnosis: String(obj?.mainDiagnosis ?? ""),
        treatmentCount: Number(obj?.treatmentCount ?? 0),
        cost: Number(obj?.cost ?? 0),
      };
      const result = predictDipScore(input);
      const report = buildDipPredictReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
