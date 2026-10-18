/**
 * 健澜科技 jlmedaios - 质控妇产科专科规则 V14 路由（M509-D，M509 收官）
 *
 * GET  /api/v1/emr-qc-obgyn-rules  （read，auth:true）返回妇产科规则列表
 * POST /api/v1/emr-qc-obgyn-rules  （auth:true）检查妇产科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildObgynReport,
  buildObgynRules,
  checkObgyn,
  type ObgynRecordV14,
} from "../aggregators/emrQcObgynRulesV14Aggregator.js";

export const emrQcObgynRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-obgyn-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-obgyn-rules:read");
      if (denied) return denied;
      const rules = buildObgynRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-obgyn-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-obgyn-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: ObgynRecordV14 = {
        hasPrenatalCheck: Boolean(body?.hasPrenatalCheck),
        hasDeliveryNote: Boolean(body?.hasDeliveryNote),
        hasPostpartumNote: Boolean(body?.hasPostpartumNote),
      };
      const result = checkObgyn(record);
      const report = buildObgynReport(result);
      return json(ok({ result, report }));
    },
  },
];
