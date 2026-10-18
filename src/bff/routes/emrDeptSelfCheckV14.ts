/**
 * 健澜科技 jlmedaios - 病历质控科室自查 V14 路由（M474-B）
 *
 * GET  /api/v1/emr-dept-self-check  （read，auth:true）返回自查列表
 * POST /api/v1/emr-dept-self-check  （auth:true，body 用 await c.req.json()）提交自查
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSelfCheck,
  type SelfCheckItemV14,
} from "../aggregators/emrDeptSelfCheckV14Aggregator.js";

export const emrDeptSelfCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-dept-self-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-dept-self-check:read");
      if (denied) return denied;
      return json(ok({ list: [] }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-dept-self-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-dept-self-check:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { dept?: string; items?: SelfCheckItemV14[] };
      const record = buildSelfCheck(body.dept ?? "", body.items ?? []);
      return json(ok({ record }));
    },
  },
];
