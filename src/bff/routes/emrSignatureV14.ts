/**
 * 健澜科技 jlmedaios - 病历电子签名与认证 V14 路由（M463-A）
 *
 * POST /api/v1/emr-signature/:noteId （auth:true，path 参数 c.params.noteId）签名
 * GET  /api/v1/emr-signature/:noteId （read，auth:true）验签返回 { valid: boolean }
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  signNote,
  verifySignature,
} from "../aggregators/emrSignatureV14Aggregator.js";

/** 内存态签名记录集（演示用，生产环境应持久化） */
const signatureState: Map<string, { authorId: string; noteHash: string; signature: string; signedAt: string }> = new Map();

export const emrSignatureV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-signature/:noteId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-signature:write");
      if (denied) return denied;
      const noteId = (c.params.noteId ?? "").trim();
      const body = await c.req.json().catch(() => ({})) as {
        authorId?: string;
        noteHash?: string;
      };
      const authorId = body.authorId ?? "unknown";
      const noteHash = body.noteHash ?? "";
      const signature = signNote(authorId, noteHash);
      signatureState.set(noteId, {
        authorId,
        noteHash,
        signature,
        signedAt: new Date().toISOString(),
      });
      return json(ok({ noteId, signature }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-signature/:noteId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-signature:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const noteId = (c.params.noteId ?? "").trim();
      const record = signatureState.get(noteId);
      if (!record) return json(ok({ valid: false, reason: "未找到签名记录" }));
      const valid = verifySignature(record.signature, record.authorId, record.noteHash);
      return json(ok({ valid, record }));
    },
  },
];
