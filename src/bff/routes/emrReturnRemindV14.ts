/**
 * 健澜科技 jlmedaios - 病历归还提醒 V14 路由（M540-C）
 *
 * GET  /api/v1/emr-return-remind  （read，auth:true）返回归还提醒基础数据
 * POST /api/v1/emr-return-remind  （auth:true）逾期检测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReturnRemind,
  buildReturnRemindReport,
  detectOverdue,
  type ReturnRemindInputV14,
} from "../aggregators/emrReturnRemindV14Aggregator.js";

export const emrReturnRemindV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-return-remind",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-return-remind:read");
      if (denied) return denied;
      const base = buildReturnRemind("REC703", "李医生");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-return-remind",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-return-remind:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: ReturnRemindInputV14 = {
        borrowDays: Number(obj?.borrowDays ?? 0),
        overdueThreshold: Number(obj?.overdueThreshold ?? 0),
      };
      const result = detectOverdue(input);
      const report = buildReturnRemindReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
