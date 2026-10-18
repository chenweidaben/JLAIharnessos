/**
 * 健澜科技 jlmedaios - 质控-营养风险筛查联动 V14 路由（M517-D，M517 收官）
 *
 * GET  /api/v1/emr-qc-nutrition-screen-link  （read，auth:true）返回营养筛查联动数据
 * POST /api/v1/emr-qc-nutrition-screen-link  （auth:true）检查营养筛查一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNutritionScreenLink,
  buildNutritionScreenLinkReport,
  checkNutritionScreenConsistency,
  type NutritionScreenConsistencyRecordV14,
} from "../aggregators/emrQcNutritionScreenLinkV14Aggregator.js";

export const emrQcNutritionScreenLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-nutrition-screen-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nutrition-screen-link:read");
      if (denied) return denied;
      const link = buildNutritionScreenLink("REC020", 5, "高风险");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-nutrition-screen-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nutrition-screen-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: NutritionScreenConsistencyRecordV14 = {
        hasScreening: Boolean(body?.hasScreening),
        hasAssessment: Boolean(body?.hasAssessment),
        hasNutritionPlan: Boolean(body?.hasNutritionPlan),
      };
      const result = checkNutritionScreenConsistency(record);
      const report = buildNutritionScreenLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
