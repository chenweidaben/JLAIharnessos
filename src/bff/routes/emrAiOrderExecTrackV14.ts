/**
 * 健澜科技 jlmedaios - 病历AI医嘱执行追踪 V14 路由（M558-C）
 *
 * GET  /api/v1/emr-ai-order-exec-track  （read，auth:true）返回 AI 医嘱执行追踪基础数据
 * POST /api/v1/emr-ai-order-exec-track  （auth:true）AI 医嘱执行追踪 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOrderExecTrack,
  buildAiOrderExecTrackReport,
  trackOrderExecByAi,
  type AiOrderExecTrackInputV14,
} from "../aggregators/emrAiOrderExecTrackV14Aggregator.js";

export const emrAiOrderExecTrackV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-order-exec-track",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-order-exec-track:read");
      if (denied) return denied;
      const base = buildAiOrderExecTrack("RECB056", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-order-exec-track",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-order-exec-track:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOrderExecTrackInputV14 = {
        totalOrders: Number(obj?.totalOrders ?? 0),
        executedOrders: Number(obj?.executedOrders ?? 0),
        overdueOrders: Number(obj?.overdueOrders ?? 0),
      };
      const result = trackOrderExecByAi(input);
      const report = buildAiOrderExecTrackReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
