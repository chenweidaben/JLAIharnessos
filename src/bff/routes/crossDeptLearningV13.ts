/**
 * 健澜科技 jlmedaios - 跨科协作任务经验双沉淀 V13 路由（M309-C）
 *
 * GET /api/v1/cross-dept-learning?dept=
 *
 * 权限：cross-dept-learning:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCrossDeptLearningScoreV13,
  countDualSedimentV13,
  dualSedimentExperienceV13,
  type CrossDeptLearningTaskV13,
} from "../aggregators/crossDeptLearningV13Aggregator.js";

const tasks: CrossDeptLearningTaskV13[] = [
  { taskId: "t1", title: "心外联合查房", deptA: "cardio", deptB: "surgery", dualSediment: true },
  { taskId: "t2", title: "影像读片会诊", deptA: "cardio", deptB: "radiology", dualSediment: true },
  { taskId: "t3", title: "病理报告互审", deptA: "surgery", deptB: "pathology", dualSediment: true },
  { taskId: "t4", title: "科内培训", deptA: "pediatrics", deptB: "pediatrics", dualSediment: false },
  { taskId: "t5", title: "科内晨会", deptA: "cardio", deptB: "cardio", dualSediment: false },
];

export const crossDeptLearningV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cross-dept-learning",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cross-dept-learning:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept");
      const scoped = dept
        ? tasks.filter((t) => t.deptA === dept || t.deptB === dept)
        : tasks;
      const dualCount = countDualSedimentV13(scoped);
      return json(ok({
        dualCount,
        totalTasks: scoped.length,
        learningScore: computeCrossDeptLearningScoreV13(dualCount, scoped.length),
        samples: scoped.slice(0, 2).map((t) => dualSedimentExperienceV13(t, t.deptA, t.deptB)),
      }));
    },
  },
];
