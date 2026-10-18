/**
 * 健澜科技 jlmedaios - 病历书写时限 SLA 实时监控 V14 路由（M461-A）
 *
 * GET /api/v1/emr-sla-monitor （read，auth:true）返回红绿灯列表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateSlaList,
  type SlaRecordV14,
} from "../aggregators/emrSlaMonitorV14Aggregator.js";

const demoRecords: SlaRecordV14[] = [
  { recordId: "R001", recordType: "首次病程记录", patientName: "张三", dueAt: "2026-10-18T12:00:00Z" },
  { recordId: "R002", recordType: "上级医师查房", patientName: "李四", dueAt: "2026-10-18T10:30:00Z" },
  { recordId: "R003", recordType: "转科记录", patientName: "王五", dueAt: "2026-10-18T09:00:00Z" },
];

export const emrSlaMonitorV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-sla-monitor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-sla-monitor:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const now = new Date().toISOString();
      const result = aggregateSlaList(demoRecords, now);
      return json(ok(result));
    },
  },
];
