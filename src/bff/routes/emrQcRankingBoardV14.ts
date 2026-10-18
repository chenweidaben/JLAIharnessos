/**
 * 健澜科技 jlmedaios - 病历科室质控排行榜 V14 路由（M470-B，-board 后缀避让）
 *
 * GET /api/v1/emr-qc-ranking-board  （read，auth:true，query 用 new URL 取 period=month）返回科室排名
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRankingBoard,
  rankDeptsByScore,
  type DeptScoreInputV14,
} from "../aggregators/emrQcRankingBoardV14Aggregator.js";

const demoDepts: DeptScoreInputV14[] = [
  { name: "内科", score: 95, prevRank: 3 },
  { name: "外科", score: 88, prevRank: 1 },
  { name: "儿科", score: 92 },
];

export const emrQcRankingBoardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-ranking-board",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ranking-board:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const period = url.searchParams.get("period") ?? "month";
      const ranked = rankDeptsByScore(demoDepts);
      const board = buildRankingBoard(ranked);
      return json(ok({ period, ranked, board }));
    },
  },
];
