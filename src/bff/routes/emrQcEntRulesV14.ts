/**
 * 健澜科技 jlmedaios - 质控耳鼻喉科专科规则 V14 路由（M511-D，M511 收官）
 *
 * GET  /api/v1/emr-qc-ent-rules  （read，auth:true）返回耳鼻喉科规则列表
 * POST /api/v1/emr-qc-ent-rules  （auth:true）检查耳鼻喉科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEntReport,
  buildEntRules,
  checkEnt,
  type EntRecordV14,
} from "../aggregators/emrQcEntRulesV14Aggregator.js";

export const emrQcEntRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-ent-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ent-rules:read");
      if (denied) return denied;
      const rules = buildEntRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-ent-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ent-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: EntRecordV14 = {
        hasEarExam: Boolean(body?.hasEarExam),
        hasNoseExam: Boolean(body?.hasNoseExam),
        hasThroatExam: Boolean(body?.hasThroatExam),
      };
      const result = checkEnt(record);
      const report = buildEntReport(result);
      return json(ok({ result, report }));
    },
  },
];
