/**
 * 健澜科技 jlmedaios - 医生能力画像与个性化学习路径 V5 路由（M276-D）
 *
 * GET /api/v1/competency-profile（个人画像）
 * GET /api/v1/competency-profile/learning-path（学习路径）
 * PUT /api/v1/competency-profile/progress（进度更新）
 *
 * 权限：competency-profile:read / competency-profile:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessCompetencyV5,
  buildCompetencyProfileV5Report,
  recommendLearningV5,
  type CompetencyProfile,
} from "../aggregators/competencyProfileV5Aggregator.js";

const profiles: CompetencyProfile[] = [
  assessCompetencyV5("u1", "心内科", { 诊断: 12, 用药: 5, 沟通: 2 }, 0.8),
  assessCompetencyV5("u2", "呼吸科", { 诊断: 4, 用药: 8, 沟通: 6 }, 0.6),
];

const pathProgress: Record<string, number> = { u1: 30, u2: 0 };

export const competencyProfileV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/competency-profile",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "competency-profile:read");
      if (denied) return denied;

      const userId = c.query.get("userId");
      if (userId) {
        const p = profiles.find((x) => x.userId === userId);
        return json(ok(p ?? { found: false }));
      }
      return json(ok(buildCompetencyProfileV5Report(profiles)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/competency-profile/learning-path",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "competency-profile:read");
      if (denied) return denied;

      const userId = c.query.get("userId") ?? "";
      const p = profiles.find((x) => x.userId === userId);
      if (!p) {
        return json(ok({ found: false }));
      }
      const path = recommendLearningV5(userId, p.gaps);
      path.completionPct = pathProgress[userId] ?? 0;
      return json(ok(path));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/competency-profile/progress",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "competency-profile:write");
      if (denied) return denied;

      const body = await c.req.json() as { userId: string; completionPct: number };
      pathProgress[body.userId] = body.completionPct;
      return json(ok({ userId: body.userId, completionPct: body.completionPct }));
    },
  },
];
