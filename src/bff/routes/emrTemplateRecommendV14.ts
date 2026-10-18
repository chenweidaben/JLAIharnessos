/**
 * 健澜科技 jlmedaios - 病历模板智能推荐 V14 路由（M539-A）
 *
 * GET  /api/v1/emr-template-recommend  （read，auth:true）返回模板推荐基础数据
 * POST /api/v1/emr-template-recommend  （auth:true）模板推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTemplateRecommend,
  buildTemplateRecommendReport,
  recommendTemplate,
  type TemplateRecommendInputV14,
} from "../aggregators/emrTemplateRecommendV14Aggregator.js";

export const emrTemplateRecommendV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-recommend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-recommend:read");
      if (denied) return denied;
      const base = buildTemplateRecommend("心内科", "D001");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-recommend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-recommend:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: TemplateRecommendInputV14 = {
        dept: String(obj?.dept ?? ""),
        recordType: String(obj?.recordType ?? ""),
      };
      const result = recommendTemplate(input);
      const report = buildTemplateRecommendReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
