/**
 * 健澜科技 jlmedaios - 质控医生评分 V14 路由（M494-A）
 *
 * GET /api/v1/emr-qc-doctor-score  （read，auth:true）返回医生评分数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDoctorScore, aggregateDoctorScores } from "../aggregators/emrQcDoctorScoreV14Aggregator.js";

const sampleScores = [
  { doctor: "张医生", dept: "内科", score: 92 },
  { doctor: "王医生", dept: "外科", score: 85 },
  { doctor: "李医生", dept: "儿科", score: 95 },
];

export const emrQcDoctorScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-doctor-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-doctor-score:read");
      if (denied) return denied;
      const scores = sampleScores.map((s) => buildDoctorScore(s.doctor, s.dept, s.score));
      const aggregate = aggregateDoctorScores(sampleScores);
      return json(ok({ scores, aggregate }));
    },
  },
];
