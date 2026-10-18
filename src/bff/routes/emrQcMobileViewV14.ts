/**
 * 健澜科技 jlmedaios - 质控移动端查看 V14 路由（M526-B）
 *
 * GET  /api/v1/emr-qc-mobile-view  （read，auth:true）返回移动端查看基础数据
 * POST /api/v1/emr-qc-mobile-view  （auth:true）移动端查看 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMobileView,
  buildMobileViewReport,
  viewOnMobile,
  type MobileViewInputV14,
} from "../aggregators/emrQcMobileViewV14Aggregator.js";

export const emrQcMobileViewV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-mobile-view",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-view:read");
      if (denied) return denied;
      const view = buildMobileView("REC030", "李医生");
      return json(ok(view));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-mobile-view",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-view:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: MobileViewInputV14 = {
        recordId: String(body?.recordId ?? ""),
        sections: Array.isArray(body?.sections) ? body.sections.map((s: unknown) => String(s)) : [],
      };
      const result = viewOnMobile(input);
      const report = buildMobileViewReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
