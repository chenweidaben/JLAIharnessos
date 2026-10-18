/**
 * 健澜科技 jlmedaios - 质控权限管理明细 V14 路由（M507-D，M507 收官，-detail 避让）
 *
 * GET  /api/v1/emr-qc-permission-detail  （read，auth:true）返回权限列表
 * POST /api/v1/emr-qc-permission-detail  （auth:true）分配权限
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assignPermission,
  buildPermission,
  type PermissionDetailV14,
} from "../aggregators/emrQcPermissionDetailV14Aggregator.js";

let samplePerms: PermissionDetailV14[] = [
  buildPermission("质控员", "规范库", "read"),
  buildPermission("管理员", "系统参数", "write"),
];

export const emrQcPermissionDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-permission-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-permission-detail:read");
      if (denied) return denied;
      return json(ok({ perms: samplePerms, total: samplePerms.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-permission-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-permission-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const role = typeof body?.role === "string" ? body.role : "";
      const resource = typeof body?.resource === "string" ? body.resource : "";
      const action = typeof body?.action === "string" ? body.action : "";
      const perm = buildPermission(role, resource, action);
      samplePerms = assignPermission(samplePerms, perm);
      return json(ok({ perms: samplePerms, total: samplePerms.length }));
    },
  },
];
