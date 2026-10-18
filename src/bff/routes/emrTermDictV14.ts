/**
 * 健澜科技 jlmedaios - 病历术语标准词库 V14 路由（M464-B）
 *
 * GET /api/v1/emr-term-dict          （read，auth:true）词库查询
 * POST /api/v1/emr-term-dict/suggest （auth:true，body 用 await c.req.json()）同义词→标准词
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  lookupStandardTerm,
  suggestCorrections,
  STANDARD_TERMS_V14,
} from "../aggregators/emrTermDictV14Aggregator.js";

export const emrTermDictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-term-dict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-term-dict:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ dict: STANDARD_TERMS_V14 }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-term-dict/suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-term-dict:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        text?: string;
      };
      const text = body.text ?? "";
      const suggestions = suggestCorrections(text);
      return json(ok({ input: text, suggestions }));
    },
  },
];
