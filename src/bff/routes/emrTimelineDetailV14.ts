/**
 * 健澜科技 jlmedaios - 病历时间轴视图 V14 路由（M464-C）
 *
 * GET /api/v1/emr-timeline-detail/:patientId （read，auth:true，path 参数 c.params.patientId）返回排序+分组后的时间轴
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTimeline,
  groupByDay,
  type TimelineEventV14,
} from "../aggregators/emrTimelineDetailV14Aggregator.js";

const demoEvents: TimelineEventV14[] = [
  { id: "E001", eventType: "admission", title: "入院登记", eventTime: "2026-10-18T08:00:00Z" },
  { id: "E002", eventType: "progress", title: "首次病程记录", eventTime: "2026-10-18T10:00:00Z" },
  { id: "E003", eventType: "lab", title: "血常规报告", eventTime: "2026-10-19T09:00:00Z" },
];

export const emrTimelineDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-timeline-detail/:patientId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-timeline-detail:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const patientId = (c.params.patientId ?? "").trim();
      const sorted = buildTimeline(demoEvents);
      const grouped = groupByDay(demoEvents);
      return json(ok({ patientId, timeline: sorted, grouped }));
    },
  },
];
