/**
 * 健澜科技 jlmedaios - 质控麻醉科专科规则 V14 路由（M512-A）
 *
 * GET  /api/v1/emr-qc-anesthesia-rules  （read，auth:true）返回麻醉科规则列表
 * POST /api/v1/emr-qc-anesthesia-rules  （auth:true）检查麻醉科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAnesthesiaReport,
  buildAnesthesiaRules,
  checkAnesthesia,
  type AnesthesiaRecordV14,
} from "../aggregators/emrQcAnesthesiaRulesV14Aggregator.js";

export const emrQcAnesthesiaRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-anesthesia-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-anesthesia-rules:read");
      if (denied) return denied;
      const rules = buildAnesthesiaRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-anesthesia-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-anesthesia-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: AnesthesiaRecordV14 = {
        hasPreAnesthesiaEval: Boolean(body?.hasPreAnesthesiaEval),
        hasIntraAnesthesiaRecord: Boolean(body?.hasIntraAnesthesiaRecord),
        hasPostAnesthesiaNote: Boolean(body?.hasPostAnesthesiaNote),
      };
      const result = checkAnesthesia(record);
      const report = buildAnesthesiaReport(result);
      return json(ok({ result, report }));
    },
  },
];
