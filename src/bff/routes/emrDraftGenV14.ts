/**
 * 健澜科技 jlmedaios - 病历 AI 草稿生成 V14 路由（M462-A）
 *
 * POST /api/v1/emr-draft-gen （auth:true，body 用 await c.req.json()）返回生成的草稿文本
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAdmissionDraft,
  buildProgressNoteDraft,
} from "../aggregators/emrDraftGenV14Aggregator.js";

export const emrDraftGenV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-draft-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-draft-gen:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        type?: "admission" | "progress";
        chiefComplaint?: string;
        presentIllness?: string;
        physicalExam?: string;
        diagnosis?: string;
        date?: string;
        bodyCondition?: string;
        treatmentAdjustment?: string;
        plan?: string;
      };
      if (body.type === "progress") {
        const draft = buildProgressNoteDraft({
          date: body.date ?? "",
          bodyCondition: body.bodyCondition ?? "",
          treatmentAdjustment: body.treatmentAdjustment ?? "",
          plan: body.plan ?? "",
        });
        return json(ok({ draft }));
      }
      const draft = buildAdmissionDraft({
        chiefComplaint: body.chiefComplaint ?? "",
        presentIllness: body.presentIllness ?? "",
        physicalExam: body.physicalExam ?? "",
        diagnosis: body.diagnosis ?? "",
      });
      return json(ok({ draft }));
    },
  },
];
