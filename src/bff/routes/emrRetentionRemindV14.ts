/**
 * 健澜科技 jlmedaios - 病历保存期限提醒 V14 路由（M541-C）
 *
 * GET  /api/v1/emr-retention-remind  （read，auth:true）返回保存期限提醒基础数据
 * POST /api/v1/emr-retention-remind  （auth:true）保存期限检测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRetentionRemind,
  buildRetentionRemindReport,
  detectRetentionExpire,
  type RetentionRemindInputV14,
} from "../aggregators/emrRetentionRemindV14Aggregator.js";

export const emrRetentionRemindV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-retention-remind",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-retention-remind:read");
      if (denied) return denied;
      const base = buildRetentionRemind("REC804", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-retention-remind",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-retention-remind:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: RetentionRemindInputV14 = {
        yearsSinceArchive: Number(obj?.yearsSinceArchive ?? 0),
        retentionYears: Number(obj?.retentionYears ?? 0),
      };
      const result = detectRetentionExpire(input);
      const report = buildRetentionRemindReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
