/**
 * 健澜科技 jlmedaios - 病案首页完整性校验 V14 路由（M535-A）
 *
 * GET  /api/v1/emr-homepage-complete  （read，auth:true）返回首页完整性校验基础数据
 * POST /api/v1/emr-homepage-complete  （auth:true）首页完整性校验 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHomepageComplete,
  buildHomepageCompleteReport,
  checkHomepageComplete,
  type HomepageCompleteInputV14,
} from "../aggregators/emrHomepageCompleteV14Aggregator.js";

export const emrHomepageCompleteV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-homepage-complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-homepage-complete:read");
      if (denied) return denied;
      const check = buildHomepageComplete("REC200", "心内科");
      return json(ok(check));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-homepage-complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-homepage-complete:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: HomepageCompleteInputV14 = {
        hasMainDiagnosis: Boolean(obj?.hasMainDiagnosis ?? false),
        hasMainSurgery: Boolean(obj?.hasMainSurgery ?? false),
        hasAdmissionDate: Boolean(obj?.hasAdmissionDate ?? false),
        hasDischargeDate: Boolean(obj?.hasDischargeDate ?? false),
      };
      const result = checkHomepageComplete(input);
      const report = buildHomepageCompleteReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
