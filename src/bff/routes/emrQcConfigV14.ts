/**
 * 健澜科技 jlmedaios - 病历质控系统配置 V14 路由（M473-D，M473 收官）
 *
 * GET /api/v1/emr-qc-config  （read，auth:true）返回系统配置
 * PUT /api/v1/emr-qc-config  （auth:true，body 用 await c.req.json()）更新配置
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQcConfig,
  validateQcConfig,
  type QcConfigV14,
} from "../aggregators/emrQcConfigV14Aggregator.js";

export const emrQcConfigV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-config",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-config:read");
      if (denied) return denied;
      const config = buildQcConfig();
      return json(ok({ config }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/emr-qc-config",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-config:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as QcConfigV14;
      const validation = validateQcConfig(body);
      if (!validation.valid) {
        return json(ok({ success: false, errors: validation.errors }));
      }
      return json(ok({ success: true, config: body }));
    },
  },
];
