/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类 V14 路由（M499-A）
 *
 * POST /api/v1/emr-qc-ai-defect-classify  （auth:true）AI 分类提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildClassifyReport, classifyDefect } from "../aggregators/emrQcAiDefectClassifyV14Aggregator.js";

export const emrQcAiDefectClassifyV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-ai-defect-classify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-defect-classify:write");
      if (denied) return denied;
      const body = await c.req.json();
      const text = typeof body?.text === "string" ? body.text : "";
      const result = classifyDefect(text);
      const report = buildClassifyReport(result);
      return json(ok({ result, report }));
    },
  },
];
