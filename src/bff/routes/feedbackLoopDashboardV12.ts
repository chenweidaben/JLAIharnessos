/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V12 路由（M294-D）
 *
 * GET /api/v1/feedback-loop-dashboard 闭环总览
 *
 * 权限：feedback-loop:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFeedbackLoopDashboardV12,
  identifyLoopBottleneckV12,
  type RetrainTaskMiniV12,
} from "../aggregators/feedbackLoopDashboardV12Aggregator.js";

const adoptionBoard = { overallAdoptionRate: 66.7 };

const retrainTasks: RetrainTaskMiniV12[] = [
  { urgent: true },
  { urgent: true },
  { urgent: false },
];

const healthDashboard = { avgScore: 68.2, criticalCount: 2 };

export const feedbackLoopDashboardV12Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/feedback-loop-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "feedback-loop:read");
      if (denied) return denied;
      const d = buildFeedbackLoopDashboardV12(adoptionBoard, retrainTasks, healthDashboard);
      return json(ok({ ...d, bottlenecks: identifyLoopBottleneckV12(d) }));
    },
  },
];
