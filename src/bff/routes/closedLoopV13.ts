/**
 * 健澜科技 jlmedaios - 闭环回灌飞轮 V13 路由（M307-D）
 *
 * GET /api/v1/closed-loop-overview
 *
 * 权限：closed-loop-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClosureRateV13,
  identifyLoopLeakV13,
  recomputeFlywheelAfterActionV13,
  type ClosedLoopTaskV13,
} from "../aggregators/closedLoopV13Aggregator.js";

const tasks: ClosedLoopTaskV13[] = [
  { taskId: "t1", title: "开跨科病例讨论会", status: "done", beforeScore: 63.4, afterScore: 70.9 },
  { taskId: "t2", title: "优化推送时机", status: "done", beforeScore: 63.4, afterScore: 66.5 },
  { taskId: "t3", title: "加强医生培训", status: "rejected", beforeScore: 63.4, afterScore: 62.0 },
  { taskId: "t4", title: "完善反馈激励", status: "open", beforeScore: 63.4, afterScore: 63.4 },
  { taskId: "t5", title: "强化同行评审", status: "in_progress", beforeScore: 63.4, afterScore: 63.4 },
];

const prevScore = 63.4;

export const closedLoopV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/closed-loop-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "closed-loop-overview:read");
      if (denied) return denied;
      const closureRate = computeClosureRateV13(tasks);
      return json(ok({
        prevScore,
        newScore: recomputeFlywheelAfterActionV13(prevScore, tasks),
        closureRate,
        leak: identifyLoopLeakV13(closureRate, false),
      }));
    },
  },
];
