/**
 * 健澜科技 jlmedaios - 病历一致性检查 V14 路由（M476-B）
 *
 * POST /api/v1/emr-consistency-check  （auth:true，body 用 await c.req.json()）返回一致性检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  checkConsistency,
  type EmrSectionV14,
} from "../aggregators/emrConsistencyCheckV14Aggregator.js";

export const emrConsistencyCheckV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-consistency-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-consistency-check:write");
      if (denied) return denied;
      const body = await c.req.json() as { sections?: EmrSectionV14[] };
      const sections = body.sections ?? [];
      const result = checkConsistency(sections);
      return json(ok({ result }));
    },
  },
];
