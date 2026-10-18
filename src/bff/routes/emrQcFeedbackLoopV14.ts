/**
 * 健澜科技 jlmedaios - 质控问题反馈闭环 V14 路由（M496-A）
 *
 * POST /api/v1/emr-qc-feedback-loop  （auth:true，body 用 await c.req.json()）反馈闭环提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildFeedbackLoop, trackFeedbackStatus } from "../aggregators/emrQcFeedbackLoopV14Aggregator.js";

const sampleRecords = [
  { issue: "缺主诉", status: "整改中" },
  { issue: "超时限", status: "已闭环" },
  { issue: "用词不规范", status: "已闭环" },
];

export const emrQcFeedbackLoopV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-feedback-loop",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-feedback-loop:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        issue?: string;
        status?: string;
      };
      const record = buildFeedbackLoop(body.issue ?? "", body.status ?? "待处理");
      const tracking = trackFeedbackStatus(sampleRecords);
      return json(ok({ record, tracking }));
    },
  },
];
