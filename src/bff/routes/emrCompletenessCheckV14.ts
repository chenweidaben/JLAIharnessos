/**
 * 健澜科技 jlmedaios - 病历完整性检查 V14 路由（M476-A）
 *
 * POST /api/v1/emr-completeness-check  （auth:true，body 用 await c.req.json()）返回完整性检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  checkCompleteness,
  computeCompletenessScore,
  type EmrFieldV14,
} from "../aggregators/emrCompletenessCheckV14Aggregator.js";

export const emrCompletenessCheckV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-completeness-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-completeness-check:write");
      if (denied) return denied;
      const body = await c.req.json() as { fields?: EmrFieldV14[] };
      const fields = body.fields ?? [];
      const result = checkCompleteness(fields);
      const score = computeCompletenessScore(result);
      return json(ok({ result, score }));
    },
  },
];
