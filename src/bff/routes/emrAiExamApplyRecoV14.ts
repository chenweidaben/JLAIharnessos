/**
 * 健澜科技 jlmedaios - 病历AI检查申请智能推荐 V14 路由（M561-A）
 *
 * GET  /api/v1/emr-ai-exam-apply-reco  （read，auth:true）返回 AI 检查申请智能推荐基础数据
 * POST /api/v1/emr-ai-exam-apply-reco  （auth:true）AI 检查申请智能推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiExamApplyReco,
  buildAiExamApplyRecoReport,
  recommendExamApplyByAi,
  type AiExamApplyRecoInputV14,
} from "../aggregators/emrAiExamApplyRecoV14Aggregator.js";

export const emrAiExamApplyRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-exam-apply-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-exam-apply-reco:read");
      if (denied) return denied;
      const base = buildAiExamApplyReco("RECB066", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-exam-apply-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-exam-apply-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiExamApplyRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        symptom: String(obj?.symptom ?? ""),
      };
      const result = recommendExamApplyByAi(input);
      const report = buildAiExamApplyRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
