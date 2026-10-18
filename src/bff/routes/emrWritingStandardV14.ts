/**
 * 健澜科技 jlmedaios - 病历书写规范知识库 V14 路由（M469-C）
 *
 * GET /api/v1/emr-writing-standard            （read，auth:true，query 用 new URL 取 keyword）返回规范条目列表
 * GET /api/v1/emr-writing-standard/:category  （read，auth:true，path 参数 c.params.category）按类别过滤
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  getRequiredSections,
  searchStandards,
  WRITING_STANDARDS_V14,
} from "../aggregators/emrWritingStandardV14Aggregator.js";

export const emrWritingStandardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-writing-standard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-writing-standard:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const keyword = url.searchParams.get("keyword") ?? "";
      const entries = keyword ? searchStandards(keyword) : WRITING_STANDARDS_V14;
      const required = getRequiredSections();
      return json(ok({ entries, requiredCount: required.length }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-writing-standard/:category",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-writing-standard:read");
      if (denied) return denied;
      const category = (c.params.category ?? "").trim();
      const entries = WRITING_STANDARDS_V14.filter((e) => e.category === category);
      return json(ok({ category, entries }));
    },
  },
];
