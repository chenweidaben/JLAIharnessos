/**
 * 健澜科技 jlmedaios - 科室任务看板 V13 路由（M308-A）
 *
 * GET /api/v1/dept-task-board?dept=
 *
 * 权限：dept-task-board:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeptTaskBoardV13,
  listDeptTasksV13,
  rankDeptByOpenV13,
  type DeptTaskV13,
} from "../aggregators/deptTaskBoardV13Aggregator.js";

const tasks: DeptTaskV13[] = [
  { taskId: "t1", title: "开跨科病例讨论会", dept: "cardio", status: "open" },
  { taskId: "t2", title: "优化推送时机", dept: "cardio", status: "overdue" },
  { taskId: "t3", title: "加强医生培训", dept: "cardio", status: "done" },
  { taskId: "t4", title: "完善反馈激励", dept: "surgery", status: "overdue" },
  { taskId: "t5", title: "强化同行评审", dept: "surgery", status: "overdue" },
  { taskId: "t6", title: "清理僵尸经验", dept: "pediatrics", status: "verifying" },
];

export const deptTaskBoardV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-task-board",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-task-board:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept");
      const board = buildDeptTaskBoardV13(tasks);
      return json(ok({
        board,
        ranking: rankDeptByOpenV13(board),
        deptTasks: dept ? listDeptTasksV13(tasks, dept) : [],
      }));
    },
  },
];
