/**
 * 健澜科技 jlmedaios - 病历质控知识库 V14 路由（M475-D，M475 收官）
 *
 * GET /api/v1/emr-qc-knowledge  （read，auth:true，query 用 new URL 取 keyword/category）返回知识库检索结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  searchQcKnowledge,
  QC_KB_ENTRIES_V14,
} from "../../knowledge/emr/qcKnowledgeBaseV14.js";

export const emrQcKnowledgeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-knowledge",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-knowledge:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const keyword = url.searchParams.get("keyword") ?? "";
      const category = url.searchParams.get("category") ?? "";
      let entries = searchQcKnowledge(keyword);
      if (category) entries = entries.filter((e) => e.category === category);
      return json(ok({ entries, total: entries.length }));
    },
  },
];
