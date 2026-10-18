/**
 * 健澜科技 jlmedaios - 环节质控 V14 路由（M481-B）
 *
 * GET /api/v1/emr-stage-qc  （read，auth:true）返回环节质控列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildStageQc, evaluateStageQuality, type StageQcItemV14, type StageQcV14 } from "../aggregators/emrStageQcV14Aggregator.js";

const demoStages: StageQcV14[] = [
  buildStageQc("入院记录", "内科"),
  buildStageQc("首次病程", "内科"),
  buildStageQc("日常病程", "内科"),
  buildStageQc("出院记录", "内科"),
];

const demoItems: StageQcItemV14[] = [
  { name: "入院记录", score: 90 },
  { name: "首次病程", score: 85 },
  { name: "日常病程", score: 95 },
  { name: "出院记录", score: 88 },
];

const demoResult = evaluateStageQuality(demoItems);

export const emrStageQcV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-stage-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-stage-qc:read");
      if (denied) return denied;
      return json(ok({ stages: demoStages, items: demoItems, result: demoResult }));
    },
  },
];
