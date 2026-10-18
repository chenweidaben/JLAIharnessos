/**
 * 健澜科技 jlmedaios - 病历缺陷自动分类 V14 路由（M470-C）
 *
 * POST /api/v1/emr-defect-classifier  （auth:true，body 用 await c.req.json()）缺陷文本→自动分类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildClassificationSummary,
  classifyDefect,
} from "../aggregators/emrDefectClassifierV14Aggregator.js";

export const emrDefectClassifierV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-defect-classifier",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-defect-classifier:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { text?: string };
      const text = body.text ?? "";
      const result = classifyDefect(text);
      const summary = buildClassificationSummary([result]);
      return json(ok({ result, summary }));
    },
  },
];
