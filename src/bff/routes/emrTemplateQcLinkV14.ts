/**
 * 健澜科技 jlmedaios - 病历模板质控联动 V14 路由（M477-D，M477 收官）
 *
 * GET /api/v1/emr-template-qc-link  （read，auth:true，query 用 new URL 取 templateId）返回模板-质控规则关联列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTemplateQcLink,
  type TemplateQcLinkV14,
} from "../aggregators/emrTemplateQcLinkV14Aggregator.js";

const demoLinks: TemplateQcLinkV14[] = [
  buildTemplateQcLink("T001", "入院记录", ["完整性", "时效性"]),
  buildTemplateQcLink("T002", "出院记录", ["完整性", "规范性"]),
];

export const emrTemplateQcLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-qc-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-qc-link:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const templateId = url.searchParams.get("templateId");
      if (templateId) {
        const link = demoLinks.find((l) => l.templateId === templateId);
        return json(ok({ link: link ?? null }));
      }
      return json(ok({ links: demoLinks }));
    },
  },
];
