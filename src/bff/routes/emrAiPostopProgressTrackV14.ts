/**
 * 健澜科技 jlmedaios - 病历AI术后病程跟踪 V14 路由（M555-C）
 *
 * GET  /api/v1/emr-ai-postop-progress-track  （read，auth:true）返回 AI 术后病程跟踪基础数据
 * POST /api/v1/emr-ai-postop-progress-track  （auth:true）AI 术后病程跟踪 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiPostopProgressTrack,
  buildAiPostopProgressTrackReport,
  trackPostopProgressByAi,
  type AiPostopProgressTrackInputV14,
} from "../aggregators/emrAiPostopProgressTrackV14Aggregator.js";

export const emrAiPostopProgressTrackV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-postop-progress-track",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-postop-progress-track:read");
      if (denied) return denied;
      const base = buildAiPostopProgressTrack("RECB043", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-postop-progress-track",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-postop-progress-track:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiPostopProgressTrackInputV14 = {
        postopDay: Number(obj?.postopDay ?? 0),
        hasFever: Boolean(obj?.hasFever ?? false),
        woundHealed: Boolean(obj?.woundHealed ?? false),
      };
      const result = trackPostopProgressByAi(input);
      const report = buildAiPostopProgressTrackReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
