/**
 * 健澜科技 jlmedaios - 病历AI出院带药建议 V14 路由（M558-D，M558 收官）
 *
 * GET  /api/v1/emr-ai-discharge-med-reco  （read，auth:true）返回 AI 出院带药建议基础数据
 * POST /api/v1/emr-ai-discharge-med-reco  （auth:true）AI 出院带药建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDischargeMedReco,
  buildAiDischargeMedRecoReport,
  recommendDischargeMedByAi,
  type AiDischargeMedRecoInputV14,
} from "../aggregators/emrAiDischargeMedRecoV14Aggregator.js";

export const emrAiDischargeMedRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-discharge-med-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-med-reco:read");
      if (denied) return denied;
      const base = buildAiDischargeMedReco("RECB057", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-discharge-med-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-med-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDischargeMedRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
      };
      const result = recommendDischargeMedByAi(input);
      const report = buildAiDischargeMedRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
