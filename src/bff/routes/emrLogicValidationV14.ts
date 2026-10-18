/**
 * 健澜科技 jlmedaios - 病历逻辑校验 V14 路由（M477-B）
 *
 * POST /api/v1/emr-logic-validation  （auth:true，body 用 await c.req.json()）返回逻辑校验结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  validateLogicRelations,
  type LogicValidationDataV14,
} from "../aggregators/emrLogicValidationV14Aggregator.js";

export const emrLogicValidationV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-logic-validation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-logic-validation:write");
      if (denied) return denied;
      const body = await c.req.json() as LogicValidationDataV14;
      const result = validateLogicRelations(body);
      return json(ok({ result }));
    },
  },
];
