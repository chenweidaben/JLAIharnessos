/**
 * 健澜科技 jlmedaios - 科室任务详情与督办 V13 路由（M308-B）
 *
 * GET /api/v1/dept-task-detail/:id
 *
 * 权限：dept-task-detail:read。
 * 路径参数用 c.params.id。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTaskDetailV13,
  computeSubItemProgressV13,
  nudgeTaskOwnerV13,
  type SubItemV13,
  type TaskHeaderV13,
  type TaskHistoryV13,
} from "../aggregators/deptTaskDetailV13Aggregator.js";

const task: TaskHeaderV13 = {
  taskId: "t1", title: "开跨科病例讨论会", owner: "dr-zhang", dept: "cardio", status: "open", nudgeCount: 0,
};

const subItems: SubItemV13[] = [
  { subItemId: "s1", label: "邀请外科室", done: true },
  { subItemId: "s2", label: "准备病例", done: true },
  { subItemId: "s3", label: "预约会议室", done: false },
  { subItemId: "s4", label: "发出通知", done: false },
  { subItemId: "s5", label: "会议纪要", done: false },
];

const history: TaskHistoryV13[] = [
  { ts: "2026-10-01", action: "创建任务", actor: "admin" },
  { ts: "2026-10-10", action: "指派给 dr-zhang", actor: "admin" },
];

export const deptTaskDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-task-detail/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-task-detail:read");
      if (denied) return denied;
      const id = c.params.id ?? "";
      const detail = buildTaskDetailV13({ ...task, taskId: id }, subItems, history);
      return json(ok({
        ...detail,
        progress: computeSubItemProgressV13(subItems),
        nudged: nudgeTaskOwnerV13(task, task.nudgeCount),
      }));
    },
  },
];
