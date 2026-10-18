/**
 * 健澜科技 jlmedaios - 病历销毁登记（避让版）V14 路由（M541-B）
 *
 * GET  /api/v1/emr-destroy-apply  （read，auth:true）返销毁登记基础数据
 * POST /api/v1/emr-destroy-apply  （auth:true）销毁登记 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDestroyApply,
  buildDestroyApplyReport,
  registerDestroyApply,
  type DestroyApplyInputV14,
} from "../aggregators/emrDestroyApplyV14Aggregator.js";

export const emrDestroyApplyV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-destroy-apply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-destroy-apply:read");
      if (denied) return denied;
      const base = buildDestroyApply("REC802", "2030-01-01");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-destroy-apply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-destroy-apply:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: DestroyApplyInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        approver: String(obj?.approver ?? ""),
        reason: String(obj?.reason ?? ""),
      };
      const result = registerDestroyApply(input);
      const report = buildDestroyApplyReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
