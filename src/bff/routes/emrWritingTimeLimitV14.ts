/**
 * 健澜科技 jlmedaios - 病历书写时限管控 V14 路由（M527-A）
 *
 * GET  /api/v1/emr-writing-time-limit  （read，auth:true）返回时限管控基础数据
 * POST /api/v1/emr-writing-time-limit  （auth:true）时限检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildWritingTimeLimit,
  buildWritingTimeLimitReport,
  checkWritingDeadline,
  type WritingTimeLimitInputV14,
} from "../aggregators/emrWritingTimeLimitV14Aggregator.js";

export const emrWritingTimeLimitV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-writing-time-limit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-writing-time-limit:read");
      if (denied) return denied;
      const limit = buildWritingTimeLimit("入院记录", 24);
      return json(ok(limit));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-writing-time-limit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-writing-time-limit:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: WritingTimeLimitInputV14 = {
        recordType: String(body?.recordType ?? ""),
        elapsedHours: Number(body?.elapsedHours ?? 0),
        deadlineHours: Number(body?.deadlineHours ?? 0),
      };
      const result = checkWritingDeadline(input);
      const report = buildWritingTimeLimitReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
