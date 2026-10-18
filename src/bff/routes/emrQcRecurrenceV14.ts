/**
 * 健澜科技 jlmedaios - 质控复发预警 V14 路由（M496-C）
 *
 * GET /api/v1/emr-qc-recurrence  （read，auth:true）返回复发预警数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { detectRecurrence, buildRecurrenceReport } from "../aggregators/emrQcRecurrenceV14Aggregator.js";

const sampleIssues = [
  { issue: "缺主诉", previous: 2, current: 3 },
  { issue: "超时限", previous: 2, current: 1 },
  { issue: "用词不规范", previous: 1, current: 2 },
];

export const emrQcRecurrenceV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-recurrence",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-recurrence:read");
      if (denied) return denied;
      const detections = sampleIssues.map((i) => detectRecurrence(i.issue, i.previous, i.current));
      const report = buildRecurrenceReport(detections);
      return json(ok({ detections, report }));
    },
  },
];
