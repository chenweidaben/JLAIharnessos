/**
 * 健澜科技 jlmedaios - 病历权限细粒度控制 V14 路由（M528-D，M528 收官）
 *
 * GET  /api/v1/emr-fine-grained-auth  （read，auth:true）返回细粒度权限基础数据
 * POST /api/v1/emr-fine-grained-auth  （auth:true）字段级权限检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFineGrainedAuth,
  buildFineGrainedAuthReport,
  checkFieldLevelPermission,
  type FineGrainedAuthInputV14,
} from "../aggregators/emrFineGrainedAuthV14Aggregator.js";

export const emrFineGrainedAuthV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-fine-grained-auth",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-fine-grained-auth:read");
      if (denied) return denied;
      const auth = buildFineGrainedAuth("主治医师", "心内科");
      return json(ok(auth));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-fine-grained-auth",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-fine-grained-auth:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: FineGrainedAuthInputV14 = {
        role: String(body?.role ?? ""),
        allowedFields: Array.isArray(body?.allowedFields) ? body.allowedFields.map((f: unknown) => String(f)) : [],
        requestedFields: Array.isArray(body?.requestedFields) ? body.requestedFields.map((f: unknown) => String(f)) : [],
      };
      const result = checkFieldLevelPermission(input);
      const report = buildFineGrainedAuthReport({
        granted: result.granted,
        deniedCount: result.deniedFields.length,
      });
      return json(ok({ input, result, report }));
    },
  },
];
