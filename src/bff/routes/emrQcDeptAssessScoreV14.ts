/**
 * 健澜科技 jlmedaios - 质控科室考核评分 V14 路由（M501-D，M501 收官）
 *
 * GET /api/v1/emr-qc-dept-assess-score  （read，auth:true）返回科室考核评分
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateDeptAssess, buildDeptAssess } from "../aggregators/emrQcDeptAssessScoreV14Aggregator.js";

const sampleAssesses = [
  buildDeptAssess("内科", 92, 1),
  buildDeptAssess("儿科", 88, 2),
  buildDeptAssess("外科", 85, 3),
];

const aggregate = aggregateDeptAssess(sampleAssesses);

export const emrQcDeptAssessScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-assess-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-assess-score:read");
      if (denied) return denied;
      return json(ok({ assesses: sampleAssesses, aggregate }));
    },
  },
];
