/**
 * 健澜科技 jlmedaios - 病种模板智能推荐 V14 路由（M525-B）
 *
 * GET  /api/v1/emr-template-disease-recommend  （read，auth:true）返回病种推荐基础数据
 * POST /api/v1/emr-template-disease-recommend  （auth:true）病种模板推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDiseaseRecommend,
  buildDiseaseRecommendReport,
  recommendDiseaseTemplate,
  type CandidateTemplateV14,
  type DiseaseRecommendInputV14,
} from "../aggregators/emrTemplateDiseaseRecommendV14Aggregator.js";

export const emrTemplateDiseaseRecommendV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-disease-recommend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-disease-recommend:read");
      if (denied) return denied;
      const recommend = buildDiseaseRecommend("冠心病", "心内科");
      return json(ok(recommend));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-disease-recommend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-disease-recommend:write");
      if (denied) return denied;
      const body = await c.req.json();
      const templates: CandidateTemplateV14[] = Array.isArray(body?.templates)
        ? body.templates.map((t: unknown) => {
            const obj = t as Record<string, unknown>;
            return {
              name: String(obj?.name ?? ""),
              dept: String(obj?.dept ?? ""),
              matchScore: Number(obj?.matchScore ?? 0),
            };
          })
        : [];
      const input: DiseaseRecommendInputV14 = {
        diseaseName: String(body?.diseaseName ?? ""),
        templates,
      };
      const result = recommendDiseaseTemplate(input);
      const report = buildDiseaseRecommendReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
