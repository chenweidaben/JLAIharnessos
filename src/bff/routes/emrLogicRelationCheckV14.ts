/**
 * 健澜科技 jlmedaios - 病历逻辑关系检查 V14 路由（M485-B）
 *
 * POST /api/v1/emr-logic-relation-check  （auth:true，body 用 await c.req.json()）返回逻辑检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkLogicRelation, buildLogicReport } from "../aggregators/emrLogicRelationCheckV14Aggregator.js";

export const emrLogicRelationCheckV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-logic-relation-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-logic-relation-check:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        diagnosis?: string;
        medication?: string;
        procedure?: string;
      };
      const data = {
        diagnosis: body.diagnosis ?? "",
        medication: body.medication ?? "",
        procedure: body.procedure ?? "",
      };
      const result = checkLogicRelation(data);
      const report = buildLogicReport(result);
      return json(ok({ result, report }));
    },
  },
];
