/**
 * 健澜科技 jlmedaios - 病历缺陷反馈与整改闭环 V14 路由（M464-D，M464 收官）
 *
 * POST /api/v1/emr-defect-feedback         （auth:true，body 用 await c.req.json()）提交缺陷整改
 * GET  /api/v1/emr-defect-feedback/:noteId   （read，auth:true，path 参数 c.params.noteId）查某病历的反馈
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFeedback,
  trackRemediationStatus,
  type FeedbackRecordV14,
} from "../aggregators/emrDefectFeedbackV14Aggregator.js";

/** 内存态反馈记录集（演示用，生产环境应持久化） */
const feedbackState: FeedbackRecordV14[] = [];

export const emrDefectFeedbackV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-defect-feedback",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-defect-feedback:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        defectId?: string;
        noteId?: string;
        writer?: string;
        feedback?: string;
      };
      const record = buildFeedback({
        defectId: body.defectId ?? "unknown",
        noteId: body.noteId ?? "unknown",
        writer: body.writer ?? "unknown",
        feedback: body.feedback ?? "",
      });
      feedbackState.push(record);
      const stats = trackRemediationStatus(feedbackState);
      return json(ok({ record, stats }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-defect-feedback/:noteId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-defect-feedback:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const noteId = (c.params.noteId ?? "").trim();
      const related = feedbackState.filter((r) => r.noteId === noteId);
      const stats = trackRemediationStatus(feedbackState);
      return json(ok({ noteId, records: related, stats }));
    },
  },
];
