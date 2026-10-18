/**
 * 健澜科技 jlmedaios - 模板审批流程 V14 路由（M524-D，M524 收官）
 *
 * GET  /api/v1/emr-template-approval  （read，auth:true）返回审批流程基础数据
 * POST /api/v1/emr-template-approval  （auth:true）提交审批 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTemplateApproval,
  buildTemplateApprovalReport,
  submitApproval,
  type TemplateApprovalInputV14,
} from "../aggregators/emrTemplateApprovalV14Aggregator.js";

export const emrTemplateApprovalV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-approval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-approval:read");
      if (denied) return denied;
      const approval = buildTemplateApproval("入院记录模板v3.0", "张医生");
      return json(ok(approval));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-approval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-approval:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: TemplateApprovalInputV14 = {
        templateName: String(body?.templateName ?? ""),
        submitter: String(body?.submitter ?? ""),
        urgency: body?.urgency === "紧急" ? "紧急" : "常规",
      };
      const result = submitApproval(input);
      const report = buildTemplateApprovalReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
