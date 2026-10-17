/**
 * 健澜科技 jlmedaios - 科室间任务协作总览 V13 路由（M308-D）
 *
 * GET /api/v1/dept-task-collab
 *
 * 权限：dept-task-collab:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateCrossDeptDependenciesV13,
  buildCollabRequestQueueV13,
  identifyBottleneckDeptV13,
  type CrossDeptTaskV13,
} from "../aggregators/deptTaskCollabV13Aggregator.js";

const tasks: CrossDeptTaskV13[] = [
  { taskId: "t1", title: "等待心外科会诊", ownerDept: "cardio", dependsOnDept: "surgery", status: "pending", waitDays: 5 },
  { taskId: "t2", title: "等待影像科读片", ownerDept: "cardio", dependsOnDept: "radiology", status: "pending", waitDays: 3 },
  { taskId: "t3", title: "等待病理结果", ownerDept: "surgery", dependsOnDept: "pathology", status: "pending", waitDays: 1 },
  { taskId: "t4", title: "已完成跨科会诊", ownerDept: "pediatrics", dependsOnDept: "cardio", status: "done", waitDays: 0 },
];

export const deptTaskCollabV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-task-collab",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-task-collab:read");
      if (denied) return denied;
      const dependencies = aggregateCrossDeptDependenciesV13(tasks);
      return json(ok({
        dependencies,
        queue: buildCollabRequestQueueV13(tasks),
        bottleneck: identifyBottleneckDeptV13(dependencies),
      }));
    },
  },
];
