/**
 * 健澜科技 jlmedaios - 病历质控评分模型 V14 路由（M479-A）
 *
 * GET /api/v1/emr-qc-score-model  （read，auth:true）返回评分模型列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildScoreModel, type QcScoreModelV14 } from "../aggregators/emrQcScoreModelV14Aggregator.js";

const demoModel: QcScoreModelV14 = buildScoreModel("质控评分模型", [
  { name: "完整性", weight: 40 },
  { name: "时效性", weight: 30 },
  { name: "规范性", weight: 30 },
]);

export const emrQcScoreModelV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-score-model",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-score-model:read");
      if (denied) return denied;
      return json(ok({ model: demoModel }));
    },
  },
];
