/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类明细 V14 路由（M508-A，-detail 避让）
 *
 * POST /api/v1/emr-qc-ai-defect-classify-detail  （auth:true）AI 分类提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildClassifyReport,
  classifyDefect,
  type AiDefectClassifyResultDetailV14,
} from "../aggregators/emrQcAiDefectClassifyDetailV14Aggregator.js";

export const emrQcAiDefectClassifyDetailV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-ai-defect-classify-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-defect-classify-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const text = typeof body?.text === "string" ? body.text : "";
      const result: AiDefectClassifyResultDetailV14 = classifyDefect(text);
      const report = buildClassifyReport([result]);
      return json(ok({ result, report }));
    },
  },
];
