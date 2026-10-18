/**
 * 健澜科技 jlmedaios - 病历复制痕迹保留 V14 路由（M463-B）
 *
 * POST /api/v1/emr-copy-trace         （auth:true，body 用 await c.req.json()）记录复制
 * GET  /api/v1/emr-copy-trace/:noteId （read，auth:true，path 参数 c.params.noteId）查某病历的复制痕迹
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  auditCopyTraces,
  recordCopy,
  type CopyTraceV14,
} from "../aggregators/emrCopyTraceV14Aggregator.js";

/** 内存态复制痕迹集（演示用，生产环境应持久化） */
const traceState: CopyTraceV14[] = [];

export const emrCopyTraceV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-copy-trace",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-trace:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        sourceNoteId?: string;
        targetNoteId?: string;
        userId?: string;
      };
      const trace = recordCopy(
        body.sourceNoteId ?? "unknown",
        body.targetNoteId ?? "unknown",
        body.userId ?? "unknown",
      );
      traceState.push(trace);
      return json(ok({ trace }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-copy-trace/:noteId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-copy-trace:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const noteId = (c.params.noteId ?? "").trim();
      const related = traceState.filter(
        (t) => t.sourceNoteId === noteId || t.targetNoteId === noteId,
      );
      const audit = auditCopyTraces(related);
      return json(ok({ noteId, traces: related, audit }));
    },
  },
];
