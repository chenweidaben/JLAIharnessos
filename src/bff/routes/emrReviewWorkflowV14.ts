/**
 * 健澜科技 jlmedaios - 病历审核工作流 V14 路由（M478-A）
 *
 * GET  /api/v1/emr-review-workflow           （read，auth:true）返回审核工作流列表
 * POST /api/v1/emr-review-workflow/transition （auth:true，body 用 await c.req.json()）执行状态流转
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReviewWorkflow,
  transitionReviewStatus,
} from "../aggregators/emrReviewWorkflowV14Aggregator.js";

const demoWorkflow = buildReviewWorkflow("MR001", "pending");

export const emrReviewWorkflowV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-review-workflow",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-review-workflow:read");
      if (denied) return denied;
      return json(ok({ workflows: [demoWorkflow] }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-review-workflow/transition",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-review-workflow:write");
      if (denied) return denied;
      const body = await c.req.json() as { currentStatus?: string; action?: string };
      const newStatus = transitionReviewStatus(body.currentStatus ?? "pending", body.action ?? "");
      return json(ok({ newStatus }));
    },
  },
];
