/**
 * 健澜科技 jlmedaios - 病历AI急诊留观病历生成 V14 路由（M560-C）
 *
 * GET  /api/v1/emr-ai-emergency-obs-note-gen  （read，auth:true）返回 AI 急诊留观病历生成基础数据
 * POST /api/v1/emr-ai-emergency-obs-note-gen  （auth:true）AI 急诊留观病历生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiEmergencyObsNoteGen,
  buildAiEmergencyObsNoteGenReport,
  genEmergencyObsNoteByAi,
  type AiEmergencyObsNoteGenInputV14,
} from "../aggregators/emrAiEmergencyObsNoteGenV14Aggregator.js";

export const emrAiEmergencyObsNoteGenV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-emergency-obs-note-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-emergency-obs-note-gen:read");
      if (denied) return denied;
      const base = buildAiEmergencyObsNoteGen("RECB064", "急诊科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-emergency-obs-note-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-emergency-obs-note-gen:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiEmergencyObsNoteGenInputV14 = {
        patientName: String(obj?.patientName ?? ""),
        observationHours: Number(obj?.observationHours ?? 0),
        condition: String(obj?.condition ?? ""),
      };
      const result = genEmergencyObsNoteByAi(input);
      const report = buildAiEmergencyObsNoteGenReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
