/**
 * 健澜科技 jlmedaios - 质控权限管理 V14 路由（M498-D，避让 M473-B emrQcPermissionV14）
 *
 * GET /api/v1/emr-qc-permission-manage  （read，auth:true）返回权限数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPermission, checkPermission } from "../aggregators/emrQcPermissionManageV14Aggregator.js";

const sampleRoles = [
  buildPermission("质控员", ["查看病历", "审核病历"]),
  buildPermission("医生", ["查看病历"]),
  buildPermission("管理员", ["全部"]),
];

export const emrQcPermissionManageV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-permission-manage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-permission-manage:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const role = url.searchParams.get("role") ?? "";
      const action = url.searchParams.get("action") ?? "";
      let hasPermission: boolean | null = null;
      if (role && action) {
        hasPermission = checkPermission(sampleRoles, role, action);
      }
      return json(ok({ roles: sampleRoles, hasPermission }));
    },
  },
];
