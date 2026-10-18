/**
 * 健澜科技 jlmedaios - 病历归档预约 V14 路由（M541-A）
 *
 * GET  /api/v1/emr-archive-appoint  （read，auth:true）返回归档预约基础数据
 * POST /api/v1/emr-archive-appoint  （auth:true）创建归档预约 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildArchiveAppoint,
  buildArchiveAppointReport,
  createArchiveAppoint,
  type ArchiveAppointInputV14,
} from "../aggregators/emrArchiveAppointV14Aggregator.js";

export const emrArchiveAppointV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive-appoint",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-appoint:read");
      if (denied) return denied;
      const base = buildArchiveAppoint("REC800", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-archive-appoint",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-appoint:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: ArchiveAppointInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        appointDate: String(obj?.appointDate ?? ""),
        operator: String(obj?.operator ?? ""),
      };
      const result = createArchiveAppoint(input);
      const report = buildArchiveAppointReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
