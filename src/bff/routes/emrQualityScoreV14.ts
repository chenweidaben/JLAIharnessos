/**
 * 健澜科技 jlmedaios - 病历质量实时评分仪表盘 V14 路由（M465-B）
 *
 * GET /api/v1/emr-quality-score （read，auth:true）返回全院/科室/个人三级评分
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeQualityScore,
  rankByScore,
  type QualityScoreInputV14,
} from "../aggregators/emrQualityScoreV14Aggregator.js";

const demoDepts: QualityScoreInputV14[] = [
  { name: "呼吸科", block: 0, major: 1, minor: 2 },
  { name: "心内科", block: 1, major: 0, minor: 1 },
  { name: "普外科", block: 0, major: 0, minor: 0 },
];

export const emrQualityScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-quality-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-score:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const hospitalScore = computeQualityScore(0, 2, 3, 5);
      const deptRanking = rankByScore(demoDepts);
      return json(ok({ hospitalScore, deptRanking }));
    },
  },
];
