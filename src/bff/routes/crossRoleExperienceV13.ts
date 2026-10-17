/**
 * 健澜科技 jlmedaios - 跨角色经验安全复用 V13 路由（M295-A）
 *
 * GET /api/v1/cross-role-experience?targetRole=nurse
 *
 * 权限：cross-role-experience:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildCrossRoleExperienceV13,
  filterByRoleV13,
  type ExperienceV13,
} from "../aggregators/crossRoleExperienceV13Aggregator.js";

const experiences: ExperienceV13[] = [
  {
    experienceId: "exp-1",
    sourceRole: "doctor",
    title: "房颤合并华法林",
    condition: "房颤",
    action: "诊断后开华法林抗凝",
    diseaseRelevance: 90,
    actionExecutable: 80,
    riskLevel: 70,
  },
  {
    experienceId: "exp-2",
    sourceRole: "doctor",
    title: "术后低体温",
    condition: "术后",
    action: "术中保温，术后观察",
    diseaseRelevance: 60,
    actionExecutable: 30,
    riskLevel: 50,
  },
  {
    experienceId: "exp-3",
    sourceRole: "pharma",
    title: "阿司匹林+华法林相互作用",
    condition: "抗凝",
    action: "审核出血风险",
    diseaseRelevance: 85,
    actionExecutable: 90,
    riskLevel: 80,
  },
];

export const crossRoleExperienceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cross-role-experience",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cross-role-experience:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const targetRole = (url.searchParams.get("targetRole") ?? "nurse") as ExperienceV13["sourceRole"];
      const filtered = filterByRoleV13(experiences, targetRole);
      const adapted = filtered.map((e) =>
        buildCrossRoleExperienceV13(e.sourceRole, targetRole, e),
      );
      return json(ok({ targetRole, count: adapted.length, items: adapted }));
    },
  },
];
