/**
 * 健澜科技 jlmedaios - ICD 编码辅助与校对 V14 路由（M464-A）
 *
 * POST /api/v1/emr-icd-coding         （auth:true，body 用 await c.req.json()）文本→编码建议
 * GET  /api/v1/emr-icd-coding/:noteId  （read，auth:true，path 参数 c.params.noteId）查编码记录
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  suggestIcdCodes,
  validateIcdCode,
  type IcdCodeSuggestionV14,
} from "../aggregators/emrIcdCodingV14Aggregator.js";

/** 内存态编码记录集（演示用，生产环境应持久化） */
const codingState: Map<string, IcdCodeSuggestionV14[]> = new Map();

export const emrIcdCodingV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-icd-coding",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-icd-coding:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        noteId?: string;
        text?: string;
      };
      const noteId = body.noteId ?? "unknown";
      const text = body.text ?? "";
      const suggestions = suggestIcdCodes(text);
      codingState.set(noteId, suggestions);
      return json(ok({ noteId, suggestions }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-icd-coding/:noteId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-icd-coding:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const noteId = (c.params.noteId ?? "").trim();
      const suggestions = codingState.get(noteId) ?? [];
      return json(ok({ noteId, suggestions, validating: suggestions.every((s) => validateIcdCode(s.code)) }));
    },
  },
];
