/**
 * 健澜科技 jlmedaios - 退役经验存档与复用 V13 路由（M305-C）
 *
 * GET /api/v1/archived-experience?q=
 *
 * 权限：archived-experience:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  archiveRetiredExperienceV13,
  searchArchivedV13,
  type ArchivedExpV13,
} from "../aggregators/archivedExperienceV13Aggregator.js";

const archivedList: ArchivedExpV13[] = [
  archiveRetiredExperienceV13({ experienceId: "e-1", title: "房颤华法林", status: "retired", retireReason: "陈旧", version: 3 }),
  archiveRetiredExperienceV13({ experienceId: "e-2", title: "旧版阿司匹林", status: "retired", retireReason: "副作用大", version: 1 }),
  archiveRetiredExperienceV13({ experienceId: "e-3", title: "华法林禁忌", status: "retired", retireReason: "被新指南取代", version: 2 }),
];

export const archivedExperienceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/archived-experience",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "archived-experience:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const q = url.searchParams.get("q") ?? "";
      return json(ok({
        totalArchived: archivedList.length,
        results: searchArchivedV13(q, archivedList),
      }));
    },
  },
];
