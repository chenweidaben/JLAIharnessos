/**
 * 健澜科技 jlmedaios - 病历关键事件时间线 V14 路由（M538-C）
 *
 * GET  /api/v1/emr-event-timeline  （read，auth:true）返回事件时间线基础数据
 * POST /api/v1/emr-event-timeline  （auth:true）事件列表构建 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEventTimeline,
  buildEventTimelineList,
  buildEventTimelineReport,
  type EventTimelineInputV14,
  type TimelineEventItemV14,
} from "../aggregators/emrEventTimelineV14Aggregator.js";

export const emrEventTimelineV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-event-timeline",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-event-timeline:read");
      if (denied) return denied;
      const timeline = buildEventTimeline("REC502", "李四");
      return json(ok(timeline));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-event-timeline",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-event-timeline:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const eventsRaw = Array.isArray(obj?.events) ? obj.events : [];
      const events: TimelineEventItemV14[] = eventsRaw.map((e: unknown) => {
        const item = e as Record<string, unknown>;
        return { day: Number(item?.day ?? 0), title: String(item?.title ?? "") };
      });
      const input: EventTimelineInputV14 = { events };
      const result = buildEventTimelineList(input);
      const report = buildEventTimelineReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
