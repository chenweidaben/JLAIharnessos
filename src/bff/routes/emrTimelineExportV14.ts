/**
 * 健澜科技 jlmedaios - 病历时间线导出 V14 路由（M538-D）
 *
 * GET  /api/v1/emr-timeline-export  （read，auth:true）返回导出基础数据
 * POST /api/v1/emr-timeline-export  （auth:true）时间线导出 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTimelineExport,
  buildTimelineExportReport,
  exportTimeline,
  type TimelineExportInputV14,
} from "../aggregators/emrTimelineExportV14Aggregator.js";

export const emrTimelineExportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-timeline-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-timeline-export:read");
      if (denied) return denied;
      const exportBase = buildTimelineExport("REC503", "PDF");
      return json(ok(exportBase));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-timeline-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-timeline-export:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: TimelineExportInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        eventCount: Number(obj?.eventCount ?? 0),
        format: String(obj?.format ?? "PDF") as TimelineExportInputV14["format"],
      };
      const result = exportTimeline(input);
      const report = buildTimelineExportReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
