/**
 * 健澜科技 jlmedaios - 病历销毁记录 V14 路由（M482-D，M482 收官）
 *
 * GET  /api/v1/emr-destroy-record  （read，auth:true）返回销毁记录列表
 * POST /api/v1/emr-destroy-record （auth:true，body 用 await c.req.json()）提交销毁记录
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDestroyRecord, checkDestroyEligibility, type DestroyRecordV14 } from "../aggregators/emrDestroyRecordV14Aggregator.js";

const demoRecords: DestroyRecordV14[] = [
  buildDestroyRecord("MR001", "保存期满", "2026-10-18"),
  buildDestroyRecord("MR002", "保存期满", "2026-10-18"),
];

export const emrDestroyRecordV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-destroy-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-destroy-record:read");
      if (denied) return denied;
      return json(ok({ records: demoRecords }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-destroy-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-destroy-record:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        medicalRecordId?: string;
        reason?: string;
        destroyDate?: string;
        recordAgeYears?: number;
        retentionYears?: number;
      };
      const record = buildDestroyRecord(
        body.medicalRecordId ?? "MR001",
        body.reason ?? "保存期满",
        body.destroyDate ?? "2026-10-18",
      );
      const eligible = checkDestroyEligibility(body.recordAgeYears ?? 30, body.retentionYears ?? 30);
      return json(ok({ record, eligible }));
    },
  },
];
