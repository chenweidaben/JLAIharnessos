/**
 * 健澜科技 jlmedaios - NLP 病历时间线构建 V14 路由（M490-D，M490 收官）
 *
 * POST /api/v1/emr-nlp-timeline  （auth:true，body 用 await c.req.json()）返回时间线数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMedicalTimeline, aggregateTimelineEvents } from "../aggregators/emrNlpTimelineV14Aggregator.js";

export const emrNlpTimelineV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-timeline",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-timeline:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        patientId?: string;
        events?: { date: string; event: string }[];
      };
      const patientId = body.patientId ?? "P001";
      const events = body.events ?? [];
      const result = buildMedicalTimeline(patientId, events);
      const aggregate = aggregateTimelineEvents(events);
      return json(ok({ result, aggregate }));
    },
  },
];
