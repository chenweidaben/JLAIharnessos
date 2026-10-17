/**
 * 健澜科技 jlmedaios - 离任医生知识资产保留 V13 路由（M297-C）
 *
 * GET  /api/v1/public-knowledge?dept=  院级公共知识库
 * POST /api/v1/public-knowledge/archive/:doctorId  归档（auth）
 *
 * 权限：public-knowledge:read / public-knowledge:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPublicKnowledgeV13,
  type ArchivedExpV13,
} from "../aggregators/publicKnowledgeV13Aggregator.js";

const seed: ArchivedExpV13[] = [
  {
    experienceId: "e-1", title: "房颤华法林", dept: "cardio",
    originalAuthor: "张主任", content: "华法林抗凝要点", scope: "public",
  },
  {
    experienceId: "e-2", title: "术后低体温", dept: "surgery",
    originalAuthor: "李医生", content: "术中保温方案", scope: "public",
  },
  {
    experienceId: "e-3", title: "阿司匹林相互作用", dept: "cardio",
    originalAuthor: "张主任", content: "出血风险", scope: "public",
  },
];

export const publicKnowledgeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/public-knowledge",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "public-knowledge:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept");
      const knowledge = buildPublicKnowledgeV13(seed);
      if (dept) {
        const filtered = knowledge.filter((k) => k.dept === dept);
        return json(ok(filtered));
      }
      return json(ok(knowledge));
    },
  },
  {
    method: "POST",
    path: "/api/v1/public-knowledge/archive/:doctorId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "public-knowledge:write");
      if (denied) return denied;
      return json(ok({ doctorId: c.params.doctorId, archived: true }));
    },
  },
];
