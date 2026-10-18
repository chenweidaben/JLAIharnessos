/**
 * 健澜科技 jlmedaios - 病历质控权限管理 V14 路由（M473-B）
 *
 * GET /api/v1/emr-qc-permission          （read，auth:true）返回权限矩阵
 * PUT /api/v1/emr-qc-permission/:role    （auth:true，path 参数 c.params.role，body 用 await c.req.json()）更新角色权限
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPermissionMatrix } from "../aggregators/emrQcPermissionV14Aggregator.js";

const demoMatrix = buildPermissionMatrix(
  ["医生", "护士", "质控员"],
  ["查看病历", "审核质控", "导出数据"],
);

export const emrQcPermissionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-permission",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-permission:read");
      if (denied) return denied;
      return json(ok({ matrix: demoMatrix }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/emr-qc-permission/:role",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-permission:write");
      if (denied) return denied;
      const role = (c.params.role ?? "").trim();
      const body = await c.req.json().catch(() => ({})) as { permissions?: Record<string, boolean> };
      return json(ok({ role, updatedPermissions: body.permissions ?? {} }));
    },
  },
];
