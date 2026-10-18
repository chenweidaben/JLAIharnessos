/**
 * 健澜科技 jlmedaios - 质控-危急值联动 V14 路由（M515-A）
 *
 * GET  /api/v1/emr-qc-critical-value-link  （read，auth:true）返回危急值联动数据
 * POST /api/v1/emr-qc-critical-value-link  （auth:true）检查危急值一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildCriticalValueLink,
  buildCriticalValueLinkReport,
  checkCriticalValueConsistency,
  type CriticalValueConsistencyRecordV14,
} from "../aggregators/emrQcCriticalValueLinkV14Aggregator.js";

export const emrQcCriticalValueLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-critical-value-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-critical-value-link:read");
      if (denied) return denied;
      const link = buildCriticalValueLink("REC009", "血钾7.2mmol/L", true);
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-critical-value-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-critical-value-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: CriticalValueConsistencyRecordV14 = {
        hasReport: Boolean(body?.hasReport),
        hasNotification: Boolean(body?.hasNotification),
        hasDocResponse: Boolean(body?.hasDocResponse),
      };
      const result = checkCriticalValueConsistency(record);
      const report = buildCriticalValueLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
