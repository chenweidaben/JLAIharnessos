/**
 * 健澜科技 jlmedaios - 病历水印追踪 V14 路由（M528-C）
 *
 * GET  /api/v1/emr-watermark-trace  （read，auth:true）返回水印追踪基础数据
 * POST /api/v1/emr-watermark-trace  （auth:true）水印应用 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  applyWatermark,
  buildWatermarkTrace,
  buildWatermarkTraceReport,
  type WatermarkApplyInputV14,
} from "../aggregators/emrWatermarkTraceV14Aggregator.js";

export const emrWatermarkTraceV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-watermark-trace",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-watermark-trace:read");
      if (denied) return denied;
      const trace = buildWatermarkTrace("REC052", "内部使用");
      return json(ok(trace));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-watermark-trace",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-watermark-trace:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: WatermarkApplyInputV14 = {
        recordId: String(body?.recordId ?? ""),
        operator: String(body?.operator ?? ""),
        watermarkText: String(body?.watermarkText ?? ""),
      };
      const result = applyWatermark(input);
      const report = buildWatermarkTraceReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
