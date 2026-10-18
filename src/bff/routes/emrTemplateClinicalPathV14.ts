/**
 * 健澜科技 jlmedaios - 临床路径模板联动 V14 路由（M525-A）
 *
 * GET  /api/v1/emr-template-clinical-path  （read，auth:true）返回临床路径联动基础数据
 * POST /api/v1/emr-template-clinical-path  （auth:true）临床路径模板联动 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildClinicalPathLink,
  buildClinicalPathLinkReport,
  linkClinicalPathTemplate,
  type ClinicalPathLinkInputV14,
} from "../aggregators/emrTemplateClinicalPathV14Aggregator.js";

export const emrTemplateClinicalPathV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-clinical-path",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-clinical-path:read");
      if (denied) return denied;
      const link = buildClinicalPathLink("心内科临床路径", "入院记录模板");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-clinical-path",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-clinical-path:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: ClinicalPathLinkInputV14 = {
        pathSteps: Array.isArray(body?.pathSteps) ? body.pathSteps.map((s: unknown) => String(s)) : [],
        requiredTemplates: Array.isArray(body?.requiredTemplates) ? body.requiredTemplates.map((t: unknown) => String(t)) : [],
        usedTemplates: Array.isArray(body?.usedTemplates) ? body.usedTemplates.map((t: unknown) => String(t)) : [],
      };
      const result = linkClinicalPathTemplate(input);
      const report = buildClinicalPathLinkReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
