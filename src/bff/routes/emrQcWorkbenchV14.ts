/**
 * 健澜科技 jlmedaios - 科室质控员工作台 V14 路由（M463-D，M463 收官）
 *
 * GET /api/v1/emr-qc-workbench （read，auth:true）返回队列统计+分类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQcQueue,
  categorizeQcTasks,
  type QcTaskV14,
} from "../aggregators/emrQcWorkbenchV14Aggregator.js";

const demoTasks: QcTaskV14[] = [
  { id: "T001", title: "入院记录缺主诉", dept: "呼吸科", priority: "high", status: "pending", dueAt: "2026-10-17T00:00:00Z" },
  { id: "T002", title: "病程记录超时", dept: "心内科", priority: "medium", status: "processing", dueAt: "2026-10-19T00:00:00Z" },
  { id: "T003", title: "出院小结模板错误", dept: "普外科", priority: "low", status: "resolved", dueAt: "2026-10-16T00:00:00Z" },
];

export const emrQcWorkbenchV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-workbench",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-workbench:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const now = new Date().toISOString();
      const queue = buildQcQueue(demoTasks);
      const categorization = categorizeQcTasks(demoTasks, now);
      return json(ok({ queue, categorization, tasks: demoTasks }));
    },
  },
];
