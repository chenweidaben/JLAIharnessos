/**
 * 健澜科技 jlmedaios - 病历时效性检查 V14 路由（M476-C）
 *
 * POST /api/v1/emr-timeliness-check  （auth:true，body 用 await c.req.json()）返回时效性检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  checkTimeliness,
  type TimelinessRecordV14,
} from "../aggregators/emrTimelinessCheckV14Aggregator.js";

export const emrTimelinessCheckV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-timeliness-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-timeliness-check:write");
      if (denied) return denied;
      const body = await c.req.json() as { records?: TimelinessRecordV14[] };
      const records = body.records ?? [];
      const result = checkTimeliness(records);
      return json(ok({ result }));
    },
  },
];
