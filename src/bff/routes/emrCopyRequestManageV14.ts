/**
 * 健澜科技 jlmedaios - 病历复印申请管理 V14 路由（M534-C）
 *
 * GET  /api/v1/emr-copy-request-manage  （read，auth:true）返回复印申请基础数据
 * POST /api/v1/emr-copy-request-manage  （auth:true）复印申请处理 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildCopyRequestManage,
  buildCopyRequestManageReport,
  processCopyRequestManage,
  type CopyRequestManageInputV14,
} from "../aggregators/emrCopyRequestManageV14Aggregator.js";

export const emrCopyRequestManageV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-copy-request-manage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-request-manage:read");
      if (denied) return denied;
      const req = buildCopyRequestManage("REC103", "患者家属");
      return json(ok(req));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-copy-request-manage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-request-manage:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: CopyRequestManageInputV14 = {
        requestId: String(obj?.requestId ?? ""),
        pages: Number(obj?.pages ?? 0),
        purpose: String(obj?.purpose ?? ""),
      };
      const result = processCopyRequestManage(input);
      const report = buildCopyRequestManageReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
