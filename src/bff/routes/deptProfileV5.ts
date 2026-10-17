/**
 * 健澜科技 jlmedaios - 科室运营画像 V5 路由（M287-B）
 *
 * GET  /api/v1/dept-profile 列表
 * GET  /api/v1/dept-profile/:id 详情
 * POST /api/v1/dept-profile/snapshot 写快照
 *
 * 权限：dept-profile:read / dept-profile:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeptProfileV5,
  classifyDeptV5,
  compareDeptV5,
  type DeptProfile,
} from "../aggregators/deptProfileV5Aggregator.js";

const deptStore: DeptProfile[] = [
  { deptName: "心内科", revenue: 1200, cost: 800, cmi: 2.1, avgStayDays: 6.5, satisfaction: 92, rankScore: 92, headcount: 45 },
  { deptName: "消化内科", revenue: 800, cost: 600, cmi: 1.6, avgStayDays: 7.2, satisfaction: 85, rankScore: 65, headcount: 38 },
  { deptName: "骨科", revenue: 1500, cost: 1100, cmi: 2.4, avgStayDays: 8.1, satisfaction: 88, rankScore: 72, headcount: 52 },
  { deptName: "儿科", revenue: 500, cost: 480, cmi: 1.2, avgStayDays: 4.5, satisfaction: 78, rankScore: 55, headcount: 28 },
];

export const deptProfileV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-profile",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-profile:read");
      if (denied) return denied;

      return json(ok(deptStore.map((d) => ({
        ...d,
        profile: buildDeptProfileV5(d),
      }))));
    },
  },
  {
    method: "GET",
    path: "/api/v1/dept-profile/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-profile:read");
      if (denied) return denied;

      const id = c.params.id;
      const idx = Number(id) - 1;
      if (idx < 0 || idx >= deptStore.length) {
        return json(ok({ found: false }));
      }
      const dept = deptStore[idx];
      const others = deptStore.filter((_, i) => i !== idx);
      return json(ok({
        dept,
        profile: buildDeptProfileV5(dept),
        compareWithFirst: others.length > 0 ? compareDeptV5(dept, others[0]) : null,
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/dept-profile/snapshot",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-profile:write");
      if (denied) return denied;

      const counts = {
        green: deptStore.filter((d) => classifyDeptV5(d.rankScore) === "green").length,
        yellow: deptStore.filter((d) => classifyDeptV5(d.rankScore) === "yellow").length,
        red: deptStore.filter((d) => classifyDeptV5(d.rankScore) === "red").length,
      };
      return json(ok({
        snapshotAt: Date.now(),
        counts,
      }));
    },
  },
];
