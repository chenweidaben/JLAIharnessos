/**
 * 健澜科技 jlmedaios - 质控移动端审批 V14 路由（M526-A）
 *
 * GET  /api/v1/emr-qc-mobile-approval  （read，auth:true）返回移动端审批基础数据
 * POST /api/v1/emr-qc-mobile-approval  （auth:true）移动端审批 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMobileApproval,
  buildMobileApprovalReport,
  approveOnMobile,
  type MobileApprovalInputV14,
} from "../aggregators/emrQcMobileApprovalV14Aggregator.js";

export const emrQcMobileApprovalV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-mobile-approval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-approval:read");
      if (denied) return denied;
      const approval = buildMobileApproval("D020", "张医生");
      return json(ok(approval));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-mobile-approval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-approval:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: MobileApprovalInputV14 = {
        defectId: String(body?.defectId ?? ""),
        decision: body?.decision === "驳回" ? "驳回" : "通过",
        comment: String(body?.comment ?? ""),
      };
      const result = approveOnMobile(input);
      const report = buildMobileApprovalReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
