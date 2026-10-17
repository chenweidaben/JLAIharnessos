/**
 * 健澜科技 jlmedaios - 任务验收与效果验证 V13 路由（M307-C）
 *
 * GET /api/v1/task-verification
 *
 * 权限：task-verification:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTaskVerificationReportV13,
  rejectIfNoImprovementV13,
  verifyTaskOutcomeV13,
  type VerifiedTaskV13,
} from "../aggregators/taskVerificationV13Aggregator.js";

const rawTasks: VerifiedTaskV13[] = [
  { taskId: "t1", title: "开跨科病例讨论会", expectedGain: 7.5, beforeScore: 63.4, afterScore: 70.9, status: "accepted" },
  { taskId: "t2", title: "优化推送时机", expectedGain: 6, beforeScore: 63.4, afterScore: 64.5, status: "accepted" },
  { taskId: "t3", title: "加强医生培训", expectedGain: 5, beforeScore: 63.4, afterScore: 62.0, status: "accepted" },
];

export const taskVerificationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/task-verification",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "task-verification:read");
      if (denied) return denied;
      const processed = rawTasks.map((t) => {
        const passed = verifyTaskOutcomeV13(t, t.beforeScore, t.afterScore);
        return rejectIfNoImprovementV13({ ...t, status: passed ? "accepted" : "rejected" });
      });
      return json(ok({
        tasks: processed,
        report: buildTaskVerificationReportV13(processed),
      }));
    },
  },
];
