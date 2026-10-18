/**
 * 健澜科技 jlmedaios - 病历质控患者满意度 V14 路由（M475-C）
 *
 * GET /api/v1/emr-patient-satisfaction  （read，auth:true）返回满意度统计
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSatisfactionStats,
  type SatisfactionResponseV14,
} from "../aggregators/emrPatientSatisfactionV14Aggregator.js";

const demoResponses: SatisfactionResponseV14[] = [
  { score: 90, dept: "内科" },
  { score: 80, dept: "内科" },
  { score: 100, dept: "外科" },
  { score: 85, dept: "外科" },
  { score: 95, dept: "外科" },
];

export const emrPatientSatisfactionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-patient-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-patient-satisfaction:read");
      if (denied) return denied;
      const stats = buildSatisfactionStats(demoResponses);
      return json(ok({ stats }));
    },
  },
];
