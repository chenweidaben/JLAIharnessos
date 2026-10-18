/**
 * 健澜科技 jlmedaios - 质控移动端整改 V14 路由（M526-D，M526 收官）
 *
 * GET  /api/v1/emr-qc-mobile-rectify  （read，auth:true）返回移动端整改基础数据
 * POST /api/v1/emr-qc-mobile-rectify  （auth:true）移动端整改 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMobileRectify,
  buildMobileRectifyReport,
  rectifyOnMobile,
  type MobileRectifyInputV14,
} from "../aggregators/emrQcMobileRectifyV14Aggregator.js";

export const emrQcMobileRectifyV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-mobile-rectify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-rectify:read");
      if (denied) return denied;
      const rectify = buildMobileRectify("D025", "张医生");
      return json(ok(rectify));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-mobile-rectify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-rectify:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: MobileRectifyInputV14 = {
        defectId: String(body?.defectId ?? ""),
        rectifyContent: String(body?.rectifyContent ?? ""),
        isResolved: Boolean(body?.isResolved ?? false),
      };
      const result = rectifyOnMobile(input);
      const report = buildMobileRectifyReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
