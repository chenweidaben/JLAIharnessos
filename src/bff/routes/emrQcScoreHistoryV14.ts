/**
 * 健澜科技 jlmedaios - 质控评分历史对比 V14 路由（M492-C）
 *
 * GET /api/v1/emr-qc-score-history  （read，auth:true）返回评分历史数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildScoreHistory, compareScoreHistory } from "../aggregators/emrQcScoreHistoryV14Aggregator.js";

const sampleRecords = [
  { date: "2026-01", score: 90 },
  { date: "2026-02", score: 85 },
  { date: "2026-03", score: 95 },
];

export const emrQcScoreHistoryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-score-history",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-score-history:read");
      if (denied) return denied;
      const history = buildScoreHistory(sampleRecords);
      const comparison = compareScoreHistory(sampleRecords);
      return json(ok({ history, comparison }));
    },
  },
];
