/**
 * 健澜科技 jlmedaios - 疾控传染病与慢病直报 V5 路由（M278-C）
 *
 * POST /api/v1/cdc-notification（自动生成直报卡）
 * GET  /api/v1/cdc-notification（传染病监测看板）
 * POST /api/v1/cdc-notification/correct（订正报告）
 *
 * 权限：cdc-notification:read / cdc-notification:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildCDCANotificationV5Report,
  buildCDCRecordV5,
  type CDCRecord,
} from "../aggregators/cdcNotificationV5Aggregator.js";

const recordStore: CDCRecord[] = [];

export const cdcNotificationV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/cdc-notification",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cdc-notification:write");
      if (denied) return denied;

      const body = await c.req.json() as { caseRef: string; diagnosis: string; patientAge: number; reportDate: string };
      const record = buildCDCRecordV5(body);
      recordStore.push(record);
      return json(ok(record));
    },
  },
  {
    method: "GET",
    path: "/api/v1/cdc-notification",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cdc-notification:read");
      if (denied) return denied;

      return json(ok(buildCDCANotificationV5Report(recordStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/cdc-notification/correct",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cdc-notification:write");
      if (denied) return denied;

      const body = await c.req.json() as { caseRef: string; correctedDiagnosis: string };
      const record = recordStore.find((r) => r.caseRef === body.caseRef);
      if (!record) {
        return json(ok({ found: false }));
      }
      record.diseaseType = body.correctedDiagnosis;
      record.status = "corrected";
      return json(ok({ found: true, record }));
    },
  },
];
