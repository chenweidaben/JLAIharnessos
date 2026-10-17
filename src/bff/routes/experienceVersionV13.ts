/**
 * 健澜科技 jlmedaios - 经验更新与版本迭代 V13 路由（M296-C）
 *
 * POST /api/v1/experience/:id/new-version  生成新版本（auth）
 * GET  /api/v1/experience/:id/versions    版本历史（auth）
 *
 * 权限：experience-version:write / experience-version:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  createNewVersionV13,
  getVersionHistoryV13,
  type ExperienceVersionV13,
} from "../aggregators/experienceVersionV13Aggregator.js";

const versions: ExperienceVersionV13[] = [
  { experienceId: "e-1", version: 1, title: "房颤华法林", content: "初始内容", authorId: "zhang", archived: false },
];

export const experienceVersionV13Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/experience/:id/new-version",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-version:write");
      if (denied) return denied;
      const old = versions[0];
      const next = createNewVersionV13(old, "更新内容", old.authorId);
      old.archived = true;
      versions.push(next);
      return json(ok(next));
    },
  },
  {
    method: "GET",
    path: "/api/v1/experience/:id/versions",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-version:read");
      if (denied) return denied;
      return json(ok(getVersionHistoryV13(c.params.id, versions)));
    },
  },
];
