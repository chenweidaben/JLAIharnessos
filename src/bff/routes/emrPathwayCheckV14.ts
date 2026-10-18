/**
 * 健澜科技 jlmedaios - 病历临床路径符合性检查 V14 路由（M537-B）
 *
 * GET  /api/v1/emr-pathway-check  （read，auth:true）返回路径检查基础数据
 * POST /api/v1/emr-pathway-check  （auth:true）路径符合性检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPathwayCheck,
  buildPathwayCheckReport,
  checkPathwayCompliance,
  type PathwayCheckInputV14,
} from "../aggregators/emrPathwayCheckV14Aggregator.js";

export const emrPathwayCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-pathway-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-pathway-check:read");
      if (denied) return denied;
      const check = buildPathwayCheck("REC401", "急性心梗路径");
      return json(ok(check));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-pathway-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-pathway-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: PathwayCheckInputV14 = {
        expectedSteps: Number(obj?.expectedSteps ?? 0),
        actualSteps: Number(obj?.actualSteps ?? 0),
        deviationDays: Number(obj?.deviationDays ?? 0),
      };
      const result = checkPathwayCompliance(input);
      const report = buildPathwayCheckReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
