/**
 * 健澜科技 jlmedaios - 病历复印申请管理（避让版）V14 路由（M540-A）
 *
 * GET  /api/v1/emr-copy-request-apply  （read，auth:true）返回复印申请基础数据
 * POST /api/v1/emr-copy-request-apply  （auth:true）创建复印申请 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildCopyRequestApply,
  buildCopyRequestApplyReport,
  createCopyRequestApply,
  type CopyRequestApplyInputV14,
} from "../aggregators/emrCopyRequestApplyV14Aggregator.js";

export const emrCopyRequestApplyV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-copy-request-apply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-request-apply:read");
      if (denied) return denied;
      const base = buildCopyRequestApply("REC700", "患者本人");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-copy-request-apply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-request-apply:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: CopyRequestApplyInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        pages: Number(obj?.pages ?? 0),
        purpose: String(obj?.purpose ?? ""),
      };
      const result = createCopyRequestApply(input);
      const report = buildCopyRequestApplyReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
