/**
 * 健澜科技 jlmedaios - 病历AI护理记录生成 V14 路由（M557-A）
 *
 * GET  /api/v1/emr-ai-nursing-note-gen  （read，auth:true）返回 AI 护理记录生成基础数据
 * POST /api/v1/emr-ai-nursing-note-gen  （auth:true）AI 护理记录生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiNursingNoteGen,
  buildAiNursingNoteGenReport,
  genNursingNoteByAi,
  type AiNursingNoteGenInputV14,
} from "../aggregators/emrAiNursingNoteGenV14Aggregator.js";

export const emrAiNursingNoteGenV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-nursing-note-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-note-gen:read");
      if (denied) return denied;
      const base = buildAiNursingNoteGen("RECB049", "护理部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-nursing-note-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-note-gen:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiNursingNoteGenInputV14 = {
        patientName: String(obj?.patientName ?? ""),
        ward: String(obj?.ward ?? ""),
        vitalSigns: String(obj?.vitalSigns ?? ""),
      };
      const result = genNursingNoteByAi(input);
      const report = buildAiNursingNoteGenReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
