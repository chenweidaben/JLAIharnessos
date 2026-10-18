/**
 * 健澜科技 jlmedaios - 病历模板版本对比 V14 路由（M466-C）
 *
 * GET /api/v1/emr-template-diff/:templateId （read，auth:true，path 参数 c.params.templateId，query 用 new URL 取 from/to 版本）返回 diff 结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  diffTemplates,
  summarizeChanges,
  type TemplateVersionV14,
} from "../aggregators/emrTemplateDiffV14Aggregator.js";

const v1Demo: TemplateVersionV14 = { version: "v1.0", fields: ["patientName", "admissionDate", "diagnosis"] };
const v2Demo: TemplateVersionV14 = { version: "v2.0", fields: ["patientName", "admissionDate", "diagnosis", "treatmentPlan"] };

export const emrTemplateDiffV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-diff/:templateId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-diff:read");
      if (denied) return denied;
      const templateId = (c.params.templateId ?? "").trim();
      const url = new URL(c.req.url);
      const fromVersion = url.searchParams.get("from") ?? v1Demo.version;
      const toVersion = url.searchParams.get("to") ?? v2Demo.version;
      const diff = diffTemplates(v1Demo, v2Demo);
      const summary = summarizeChanges(diff);
      return json(ok({ templateId, fromVersion, toVersion, diff, summary }));
    },
  },
];
