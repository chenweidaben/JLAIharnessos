/**
 * 健澜科技 jlmedaios - 入院记录模板细化 V14 路由（M523-B）
 *
 * GET  /api/v1/emr-template-admission-detail  （read，auth:true）返回细化基础数据
 * POST /api/v1/emr-template-admission-detail  （auth:true）渲染入院模板 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAdmissionDetail,
  buildAdmissionDetailReport,
  renderAdmissionTemplate,
  type AdmissionRenderInputV14,
} from "../aggregators/emrTemplateAdmissionDetailV14Aggregator.js";

export const emrTemplateAdmissionDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-admission-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-admission-detail:read");
      if (denied) return denied;
      const detail = buildAdmissionDetail("心内科", "v3.2");
      return json(ok(detail));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-admission-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-admission-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: AdmissionRenderInputV14 = {
        sections: Array.isArray(body?.sections) ? body.sections.map((s: unknown) => String(s)) : [],
        patientName: String(body?.patientName ?? "张三"),
      };
      const result = renderAdmissionTemplate(input);
      const report = buildAdmissionDetailReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
