/**
 * 健澜科技 jlmedaios - 质控缺陷案例库 V14 路由（M520-B）
 *
 * GET  /api/v1/emr-qc-defect-case-library  （read，auth:true）返回案例库基础数据
 * POST /api/v1/emr-qc-defect-case-library  （auth:true）搜索案例 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDefectCaseLibrary,
  buildDefectCaseLibraryReport,
  searchDefectCases,
  type DefectCaseV14,
} from "../aggregators/emrQcDefectCaseLibraryV14Aggregator.js";

export const emrQcDefectCaseLibraryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-defect-case-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-defect-case-library:read");
      if (denied) return denied;
      const library = buildDefectCaseLibrary("时限类", 120);
      return json(ok(library));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-defect-case-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-defect-case-library:write");
      if (denied) return denied;
      const body = await c.req.json();
      const query = String(body?.query ?? "");
      const cases: DefectCaseV14[] = Array.isArray(body?.cases)
        ? body.cases.map((c: unknown) => ({
            id: String((c as DefectCaseV14)?.id ?? ""),
            title: String((c as DefectCaseV14)?.title ?? ""),
            category: String((c as DefectCaseV14)?.category ?? ""),
          }))
        : [];
      const result = searchDefectCases(query, cases);
      const report = buildDefectCaseLibraryReport(result);
      return json(ok({ query, cases, result, report }));
    },
  },
];
