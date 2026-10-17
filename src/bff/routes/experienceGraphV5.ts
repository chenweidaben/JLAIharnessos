/**
 * 健澜科技 jlmedaios - 经验图谱与后继者继承 V5 路由（M275-D）
 *
 * POST /api/v1/experience-graph/onboard（为新人生成必读包）
 * GET  /api/v1/experience-graph（图谱与继承报告）
 *
 * 权限：experience-graph:write / experience-graph:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildExperienceGraphV5,
  buildExperienceGraphV5Report,
  onboardInheritorV5,
  type InheritorOnboarding,
} from "../aggregators/experienceGraphV5Aggregator.js";

const teamStore: { id: string; specialty: string; situation: string; upvotes: number }[] = [
  { id: "e1", specialty: "心内科", situation: "胸痛待查", upvotes: 20 },
  { id: "e2", specialty: "心内科", situation: "心衰管理", upvotes: 15 },
  { id: "e3", specialty: "呼吸科", situation: "慢阻肺急性加重", upvotes: 10 },
];

const inheritorStore: InheritorOnboarding[] = [];

export const experienceGraphV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/experience-graph/onboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-graph:write");
      if (denied) return denied;

      const body = await c.req.json() as { userId: string };
      const pkg = onboardInheritorV5(body.userId, teamStore);
      inheritorStore.push(pkg);
      return json(ok(pkg));
    },
  },
  {
    method: "GET",
    path: "/api/v1/experience-graph",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-graph:read");
      if (denied) return denied;

      const { nodes, edges } = buildExperienceGraphV5(teamStore);
      const report = buildExperienceGraphV5Report(nodes, edges, inheritorStore);
      return json(ok(report));
    },
  },
];
