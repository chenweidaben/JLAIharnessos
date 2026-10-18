/**
 * 健澜科技 jlmedaios - 病历时间轴生成 V14 路由（M538-A）
 *
 * GET  /api/v1/emr-timeline-generate  （read，auth:true）返回时间轴基础数据
 * POST /api/v1/emr-timeline-generate  （auth:true）时间轴生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTimeline,
  buildTimelineReport,
  generateTimeline,
  type TimelineGenerateInputV14,
} from "../aggregators/emrTimelineGenerateV14Aggregator.js";

export const emrTimelineGenerateV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-timeline-generate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-timeline-generate:read");
      if (denied) return denied;
      const timeline = buildTimeline("REC500", "张三");
      return json(ok(timeline));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-timeline-generate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-timeline-generate:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: TimelineGenerateInputV14 = {
        admissionDate: String(obj?.admissionDate ?? ""),
        dischargeDate: String(obj?.dischargeDate ?? ""),
        eventCount: Number(obj?.eventCount ?? 0),
      };
      const result = generateTimeline(input);
      const report = buildTimelineReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
