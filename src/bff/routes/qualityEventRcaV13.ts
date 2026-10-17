/**
 * 健澜科技 jlmedaios - 不良事件根因分析 RCA 辅助 V13 路由（M311-C）
 *
 * GET /api/v1/quality-event-rca?eventType=
 *
 * 权限：quality-event-rca:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFiveWhyTemplateV13,
  clusterSimilarEventsV13,
  type QualityEventV13,
} from "../aggregators/qualityEventRcaV13Aggregator.js";

const events: QualityEventV13[] = [
  { id: "e1", eventType: "fall", description: "患者下床摔倒" },
  { id: "e2", eventType: "fall", description: "夜间跌倒" },
  { id: "e3", eventType: "fall", description: "如厕滑倒" },
  { id: "e4", eventType: "medication", description: "给药错误" },
];

export const qualityEventRcaV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/quality-event-rca",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "quality-event-rca:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const eventType = url.searchParams.get("eventType") ?? "fall";
      const similar = clusterSimilarEventsV13(events, eventType);
      return json(ok({
        eventType,
        similarCount: similar.length,
        similar,
        template: similar.length > 0 ? buildFiveWhyTemplateV13(similar[0]) : null,
      }));
    },
  },
];
