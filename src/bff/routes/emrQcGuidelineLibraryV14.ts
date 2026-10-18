/**
 * 健澜科技 jlmedaios - 质控指南库 V14 路由（M505-C）
 *
 * GET /api/v1/emr-qc-guideline-library?specialty=xxx  （read，auth:true）返回指南库
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGuideline, filterGuidelines, type GuidelineLibraryV14 } from "../aggregators/emrQcGuidelineLibraryV14Aggregator.js";

const allGuidelines: GuidelineLibraryV14[] = [
  buildGuideline("内科诊疗指南", "内科", 2025),
  buildGuideline("外科手术指南", "外科", 2024),
  buildGuideline("内科用药指南", "内科", 2026),
];

export const emrQcGuidelineLibraryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-guideline-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-guideline-library:read");
      if (denied) return denied;
      const specialty = new URL(c.req.url).searchParams.get("specialty") ?? "";
      const guidelines = specialty ? filterGuidelines(allGuidelines, specialty) : allGuidelines;
      return json(ok({ guidelines, total: guidelines.length }));
    },
  },
];
