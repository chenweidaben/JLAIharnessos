/**
 * 健澜科技 jlmedaios - 质控中医科专科规则 V14 路由（M510-C）
 *
 * GET  /api/v1/emr-qc-tcm-rules  （read，auth:true）返回中医科规则列表
 * POST /api/v1/emr-qc-tcm-rules  （auth:true）检查中医科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTcmReport,
  buildTcmRules,
  checkTcm,
  type TcmRecordV14,
} from "../aggregators/emrQcTcmRulesV14Aggregator.js";

export const emrQcTcmRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-tcm-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-tcm-rules:read");
      if (denied) return denied;
      const rules = buildTcmRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-tcm-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-tcm-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: TcmRecordV14 = {
        hasSyndromeDifferentiation: Boolean(body?.hasSyndromeDifferentiation),
        hasPrescription: Boolean(body?.hasPrescription),
        hasAcupunctureRecord: Boolean(body?.hasAcupunctureRecord),
      };
      const result = checkTcm(record);
      const report = buildTcmReport(result);
      return json(ok({ result, report }));
    },
  },
];
