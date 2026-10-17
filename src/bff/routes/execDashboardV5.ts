/**
 * 健澜科技 jlmedaios - 院长驾驶舱 V5 路由（M287-A）
 *
 * GET  /api/v1/exec-dashboard 总览
 * GET  /api/v1/exec-dashboard/kpis 八宫格
 * GET  /api/v1/exec-dashboard/rank 科室排名
 * POST /api/v1/exec-dashboard/snapshot 写快照
 *
 * 权限：exec-dashboard:read / exec-dashboard:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildExecDashboardV5,
  rankDepartmentsV5,
  vsTargetV5,
  type DeptPerf,
  type ExecKPI,
} from "../aggregators/execDashboardV5Aggregator.js";

const kpiStore: ExecKPI[] = [
  { name: "门诊量", value: 9200, target: 10000, unit: "人次/日", trend: "up" },
  { name: "住院量", value: 520, target: 500, unit: "人", trend: "up" },
  { name: "手术量", value: 120, target: 100, unit: "台", trend: "up" },
  { name: "CMI", value: 1.8, target: 1.8, unit: "", trend: "flat" },
  { name: "平均住院日", value: 7.2, target: 7, unit: "天", trend: "down" },
  { name: "患者满意度", value: 92, target: 95, unit: "%", trend: "up" },
  { name: "医疗收入", value: 4800, target: 5000, unit: "万元", trend: "up" },
  { name: "医疗成本", value: 3200, target: 3500, unit: "万元", trend: "down" },
];

const deptStore: DeptPerf[] = [
  { name: "心内科", score: 92 },
  { name: "消化内科", score: 85 },
  { name: "骨科", score: 88 },
  { name: "妇产科", score: 79 },
];

export const execDashboardV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/exec-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "exec-dashboard:read");
      if (denied) return denied;

      return json(ok(buildExecDashboardV5(kpiStore)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/exec-dashboard/kpis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "exec-dashboard:read");
      if (denied) return denied;

      return json(ok(kpiStore.map((k) => ({
        ...k,
        achievementPct: vsTargetV5(k.value, k.target),
      }))));
    },
  },
  {
    method: "GET",
    path: "/api/v1/exec-dashboard/rank",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "exec-dashboard:read");
      if (denied) return denied;

      return json(ok(rankDepartmentsV5(deptStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/exec-dashboard/snapshot",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "exec-dashboard:write");
      if (denied) return denied;

      return json(ok({
        snapshotAt: Date.now(),
        summary: buildExecDashboardV5(kpiStore),
      }));
    },
  },
];
