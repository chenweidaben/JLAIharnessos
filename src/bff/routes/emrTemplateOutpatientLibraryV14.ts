/**
 * 健澜科技 jlmedaios - 门诊病历模板库 V14 路由（M523-A）
 *
 * GET  /api/v1/emr-template-outpatient-library  （read，auth:true）返回模板库基础数据
 * POST /api/v1/emr-template-outpatient-library  （auth:true）搜索模板 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildOutpatientLibrary,
  buildOutpatientLibraryReport,
  searchOutpatientTemplates,
  type OutpatientTemplateItemV14,
} from "../aggregators/emrTemplateOutpatientLibraryV14Aggregator.js";

export const emrTemplateOutpatientLibraryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-outpatient-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-outpatient-library:read");
      if (denied) return denied;
      const library = buildOutpatientLibrary("内科门诊", 80);
      return json(ok(library));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-outpatient-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-outpatient-library:write");
      if (denied) return denied;
      const body = await c.req.json();
      const query = String(body?.query ?? "感染");
      const templates: OutpatientTemplateItemV14[] = Array.isArray(body?.templates)
        ? body.templates.map((t: unknown) => ({
            id: String((t as OutpatientTemplateItemV14)?.id ?? ""),
            name: String((t as OutpatientTemplateItemV14)?.name ?? ""),
            dept: String((t as OutpatientTemplateItemV14)?.dept ?? ""),
          }))
        : [];
      const result = searchOutpatientTemplates(query, templates);
      const report = buildOutpatientLibraryReport(result);
      return json(ok({ query, templates, result, report }));
    },
  },
];
