/**
 * 健澜科技 jlmedaios - 病历质控质量监控大盘 V14 路由（M474-D，M474 收官）
 *
 * GET /api/v1/emr-qc-monitor-board  （read，auth:true）返回实时监控大盘
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMonitorBoard,
  buildRealTimeStats,
  type RealTimeEventV14,
} from "../aggregators/emrQcMonitorBoardV14Aggregator.js";

const demoEvents: RealTimeEventV14[] = [
  { action: "审核", count: 45 },
  { action: "退回", count: 8 },
  { action: "通过", count: 37 },
];

export const emrQcMonitorBoardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-monitor-board",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-monitor-board:read");
      if (denied) return denied;
      const board = buildMonitorBoard({
        todayReviewed: 45,
        todayPending: 8,
        weekPassRate: 92,
        alertCount: 2,
      });
      const stats = buildRealTimeStats(demoEvents);
      return json(ok({ board, stats }));
    },
  },
];
