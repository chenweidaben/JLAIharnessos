/**
 * 健澜科技 jlmedaios - 病历模板使用统计 V14 路由（M468-C）
 *
 * GET /api/v1/emr-template-usage  （read，auth:true）返回模板使用频次+修改率
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateTemplateUsage,
  rankTemplates,
  type TemplateUsageV14,
} from "../aggregators/emrTemplateUsageV14Aggregator.js";

const demoUsages: TemplateUsageV14[] = [
  { templateId: "T001", used: true, modified: true },
  { templateId: "T001", used: true, modified: true },
  { templateId: "T001", used: true, modified: false },
  { templateId: "T002", used: true, modified: false },
  { templateId: "T002", used: true, modified: false },
];

export const emrTemplateUsageV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-usage:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const aggregated = aggregateTemplateUsage(demoUsages);
      const ranked = rankTemplates(aggregated);
      return json(ok({ ranked }));
    },
  },
];
