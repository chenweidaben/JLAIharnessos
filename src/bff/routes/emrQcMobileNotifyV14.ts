/**
 * 健澜科技 jlmedaios - 质控移动端通知 V14 路由（M526-C）
 *
 * GET  /api/v1/emr-qc-mobile-notify  （read，auth:true）返回移动端通知基础数据
 * POST /api/v1/emr-qc-mobile-notify  （auth:true）移动端通知 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMobileNotify,
  buildMobileNotifyReport,
  notifyOnMobile,
  type MobileNotifyInputV14,
} from "../aggregators/emrQcMobileNotifyV14Aggregator.js";

export const emrQcMobileNotifyV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-mobile-notify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-notify:read");
      if (denied) return denied;
      const notify = buildMobileNotify("质控科", "缺陷通知");
      return json(ok(notify));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-mobile-notify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-mobile-notify:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: MobileNotifyInputV14 = {
        recipients: Array.isArray(body?.recipients) ? body.recipients.map((r: unknown) => String(r)) : [],
        message: String(body?.message ?? ""),
      };
      const result = notifyOnMobile(input);
      const report = buildMobileNotifyReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
