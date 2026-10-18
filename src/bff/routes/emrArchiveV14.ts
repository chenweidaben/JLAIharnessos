/**
 * 健澜科技 jlmedaios - 病历归档与封存管理 V14 路由（M462-B）
 *
 * GET /api/v1/emr-archive          （read，auth:true）返回归档列表
 * POST /api/v1/emr-archive/:id/seal （auth:true，path 参数 c.params.id）封存病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeArchiveDays,
  isArchivable,
  type ArchiveRecordV14,
} from "../aggregators/emrArchiveV14Aggregator.js";

/** 内存态归档记录集（演示用，生产环境应持久化） */
let archiveState: ArchiveRecordV14[] = [
  { recordId: "A001", patientName: "张三", dischargedAt: "2026-10-08T00:00:00Z", sealed: false },
  { recordId: "A002", patientName: "李四", dischargedAt: "2026-10-15T00:00:00Z", sealed: false },
];

export const emrArchiveV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const now = new Date().toISOString();
      const items = archiveState.map((r) => ({
        ...r,
        archiveDays: computeArchiveDays(r.dischargedAt, now),
        archivable: isArchivable(r.dischargedAt, now),
      }));
      return json(ok({ items }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-archive/:id/seal",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive:write");
      if (denied) return denied;
      const recordId = (c.params.id ?? "").trim();
      const target = archiveState.find((r) => r.recordId === recordId);
      if (!target) return json(ok({ error: "未找到归档记录" }));
      const now = new Date().toISOString();
      if (!isArchivable(target.dischargedAt, now)) {
        return json(ok({ error: "出院未满 7 天，不可归档" }));
      }
      const updated: ArchiveRecordV14 = { ...target, sealed: true };
      archiveState = archiveState.map((r) => (r.recordId === recordId ? updated : r));
      return json(ok({ record: updated }));
    },
  },
];
