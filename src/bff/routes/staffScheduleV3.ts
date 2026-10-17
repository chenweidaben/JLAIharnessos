/**
 * 健澜科技 jlmedaios - 人力排班与调度优化 V3 路由（M277-D）
 *
 * GET /api/v1/staff-schedule（排班表）
 * POST /api/v1/staff-schedule/auto（自动排班生成）
 * PUT /api/v1/staff-schedule（调整）
 *
 * 权限：staff-schedule:read / staff-schedule:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStaffScheduleV3Report,
  optimizeScheduleV3,
  type ShiftDemand,
  type Staff,
} from "../aggregators/staffScheduleV3Aggregator.js";

const staffPool: Staff[] = [
  { staffId: "s1", name: "张三", skills: ["护理", "心电"], shiftCount: 4 },
  { staffId: "s2", name: "李四", skills: ["护理"], shiftCount: 6 },
  { staffId: "s3", name: "王五", skills: ["护理", "抢救"], shiftCount: 2 },
];

const demandStore: ShiftDemand[] = [
  { date: "d1", shift: "白班", required: 2, requiredSkill: "护理" },
  { date: "d1", shift: "夜班", required: 1, requiredSkill: "抢救" },
];

let assignments = optimizeScheduleV3(demandStore, staffPool);

export const staffScheduleV3Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-schedule",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-schedule:read");
      if (denied) return denied;

      return json(ok(buildStaffScheduleV3Report(assignments, demandStore, staffPool)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/staff-schedule/auto",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-schedule:write");
      if (denied) return denied;

      assignments = optimizeScheduleV3(demandStore, staffPool);
      return json(ok({ regenerated: true, count: assignments.length }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/staff-schedule",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-schedule:write");
      if (denied) return denied;

      const body = await c.req.json() as { date: string; shift: string; staffId: string };
      const idx = assignments.findIndex((a) => a.date === body.date && a.shift === body.shift);
      if (idx >= 0) {
        assignments[idx] = { ...assignments[idx], staffId: body.staffId, skillMatched: true };
      }
      return json(ok({ adjusted: idx >= 0, assignment: assignments[idx] }));
    },
  },
];
