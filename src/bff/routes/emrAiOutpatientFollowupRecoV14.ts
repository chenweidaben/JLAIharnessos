/**
 * 健澜科技 jlmedaios - 病历AI门诊复诊提醒推荐 V14 路由（M560-D，M560 收官）
 *
 * GET  /api/v1/emr-ai-outpatient-followup-reco  （read，auth:true）返回 AI 门诊复诊提醒推荐基础数据
 * POST /api/v1/emr-ai-outpatient-followup-reco  （auth:true）AI 门诊复诊提醒推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOutpatientFollowupReco,
  buildAiOutpatientFollowupRecoReport,
  recommendFollowupByAi,
  type AiOutpatientFollowupRecoInputV14,
} from "../aggregators/emrAiOutpatientFollowupRecoV14Aggregator.js";

export const emrAiOutpatientFollowupRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-outpatient-followup-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-outpatient-followup-reco:read");
      if (denied) return denied;
      const base = buildAiOutpatientFollowupReco("RECB065", "门诊部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-outpatient-followup-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-outpatient-followup-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOutpatientFollowupRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        severity: String(obj?.severity ?? ""),
      };
      const result = recommendFollowupByAi(input);
      const report = buildAiOutpatientFollowupRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
