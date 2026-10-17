/**
 * 健澜科技 jlmedaios - 跨科室经验扩散 V13 路由（M304-A）
 *
 * GET /api/v1/cross-dept-broadcast?experienceId=
 *
 * 权限：cross-dept-broadcast:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  broadcastExperienceV13,
  findAdoptableDepartmentsV13,
  scoreDiffusionPotentialV13,
  type DeptExperienceV13,
  type DepartmentV13,
} from "../aggregators/crossDeptBroadcastV13Aggregator.js";

const experience: DeptExperienceV13 = {
  experienceId: "e-1",
  title: "房颤华法林",
  evidenceStrength: 0.9,
  generalityScore: 0.6,
  coveredDepts: ["cardio", "icu"],
};

const allDepts: DepartmentV13[] = [
  { deptId: "cardio", deptName: "心内科" },
  { deptId: "icu", deptName: "ICU" },
  { deptId: "surgery", deptName: "外科" },
  { deptId: "emergency", deptName: "急诊" },
];

export const crossDeptBroadcastV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cross-dept-broadcast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cross-dept-broadcast:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("experienceId");
      const candidates = findAdoptableDepartmentsV13(experience, allDepts);
      return json(ok({
        experienceId: experience.experienceId,
        diffusionScore: scoreDiffusionPotentialV13(experience),
        candidateCount: candidates.length,
        notices: broadcastExperienceV13(experience, candidates),
      }));
    },
  },
];
