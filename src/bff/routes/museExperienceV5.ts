/**
 * 健澜科技 jlmedaios - MUSE 个人经验沉淀闭环 V5 路由（M275-A）
 *
 * POST /api/v1/muse-experience（写：guarded权限+审计+幂等键）
 * GET  /api/v1/muse-experience（按角色/专科/场景检索）
 *
 * 权限：muse-experience:write / muse-experience:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMUSEExperienceV5Report,
  recordExperienceV5,
  deduplicateExperienceV5,
  type ExperienceRecord,
} from "../aggregators/museExperienceV5Aggregator.js";

/** 内存存储（演示用，生产替换为 repo） */
const store: ExperienceRecord[] = [];

export const museExperienceV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/muse-experience",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-experience:write");
      if (denied) return denied;

      const body = await c.req.json() as Omit<ExperienceRecord, "id" | "upvotes" | "downvotes" | "status">;
      const record = recordExperienceV5(body);
      store.push(record);
      const deduped = deduplicateExperienceV5(store);
      store.length = 0;
      store.push(...deduped);
      return json(ok(record));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-experience",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-experience:read");
      if (denied) return denied;

      const role = c.query.get("role");
      const specialty = c.query.get("specialty");
      let filtered = store;
      if (role) filtered = filtered.filter((e) => e.role === role);
      if (specialty) filtered = filtered.filter((e) => e.specialty === specialty);
      const report = buildMUSEExperienceV5Report(filtered);
      return json(ok(report));
    },
  },
];
