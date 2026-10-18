/**
 * 健澜科技 jlmedaios - 病历时效合规检查 V14 路由（M485-D，M485 收官）
 *
 * POST /api/v1/emr-timeliness-compliance  （auth:true，body 用 await c.req.json()）返回时效合规检查结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { checkTimelinessCompliance, buildTimelinessReport } from "../aggregators/emrTimelinessComplianceV14Aggregator.js";

export const emrTimelinessComplianceV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-timeliness-compliance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-timeliness-compliance:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        records?: { name: string; deadlineHours: number; actualHours: number }[];
      };
      const records = body.records ?? [];
      const result = checkTimelinessCompliance(records);
      const report = buildTimelinessReport(result);
      return json(ok({ result, report }));
    },
  },
];
