/**
 * 健澜科技 jlmedaios - 科室经验 SOP 沉淀 V13 路由（M308-C）
 *
 * GET /api/v1/dept-sop?dept=
 *
 * 权限：dept-sop:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeptSopLibraryV13,
  rankSopByUsageV13,
  type DeptSopV13,
} from "../aggregators/deptSopV13Aggregator.js";

const sops: DeptSopV13[] = [
  { sopId: "s1", title: "跨科病例讨论会规范", dept: "cardio", actions: ["邀请外科室", "准备病例"], scenario: "疑难病例", usageCount: 20 },
  { sopId: "s2", title: "推送时机优化", dept: "cardio", actions: ["选择早8点", "避免午休"], scenario: "AI推送", usageCount: 10 },
  { sopId: "s3", title: "术后随访SOP", dept: "surgery", actions: ["术后3天电话", "7天复诊"], scenario: "术后", usageCount: 5 },
];

export const deptSopV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-sop",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-sop:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const library = buildDeptSopLibraryV13(dept, sops);
      return json(ok({
        dept,
        library: rankSopByUsageV13(library),
      }));
    },
  },
];
