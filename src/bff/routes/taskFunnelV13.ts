/**
 * 健澜科技 jlmedaios - 任务进度追踪与升级 V13 路由（M307-B）
 *
 * GET /api/v1/task-funnel
 *
 * 权限：task-funnel:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTaskFunnelV13,
  checkTaskOverdueV13,
  escalateTaskV13,
  type FlywheelTaskV13,
} from "../aggregators/taskFunnelV13Aggregator.js";

const tasks: FlywheelTaskV13[] = [
  { taskId: "t1", title: "开跨科病例讨论会", owner: "dr-zhang", deadline: "2026-10-20", expectedGain: 7.5, status: "open", completedSubItems: 0, totalSubItems: 5 },
  { taskId: "t2", title: "优化推送时机", owner: "dr-li", deadline: "2026-10-10", expectedGain: 6, status: "in_progress", completedSubItems: 2, totalSubItems: 4 },
  { taskId: "t3", title: "加强医生培训", owner: "dr-wang", deadline: "2026-09-30", expectedGain: 5, status: "done", completedSubItems: 3, totalSubItems: 3 },
  { taskId: "t4", title: "完善反馈激励", owner: "dr-chen", deadline: "2026-10-01", expectedGain: 5, status: "escalated", completedSubItems: 1, totalSubItems: 4 },
];

export const taskFunnelV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/task-funnel",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "task-funnel:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const today = url.searchParams.get("today") ?? "2026-10-17";
      const overdue = tasks.filter((t) => checkTaskOverdueV13(t, today));
      const escalated = overdue.map((t) => escalateTaskV13(t));
      return json(ok({
        funnel: buildTaskFunnelV13(tasks),
        overdueCount: overdue.length,
        escalatedList: escalated.map((e) => ({ taskId: e.taskId, owner: e.owner, status: e.status })),
      }));
    },
  },
];
