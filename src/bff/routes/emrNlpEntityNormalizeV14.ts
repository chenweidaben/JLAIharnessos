/**
 * 健澜科技 jlmedaios - 病历 NLP 实体归一化 V14 路由（M531-A）
 *
 * GET  /api/v1/emr-nlp-entity-normalize  （read，auth:true）返回实体归一化基础数据
 * POST /api/v1/emr-nlp-entity-normalize  （auth:true）实体归一化 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNlpEntityNormalize,
  buildNlpEntityNormalizeReport,
  normalizeEntityToCode,
  type NlpEntityNormalizeInputV14,
} from "../aggregators/emrNlpEntityNormalizeV14Aggregator.js";

export const emrNlpEntityNormalizeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-nlp-entity-normalize",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-entity-normalize:read");
      if (denied) return denied;
      const nlp = buildNlpEntityNormalize("疾病", "ICD-10");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-nlp-entity-normalize",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-entity-normalize:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: NlpEntityNormalizeInputV14 = {
        rawEntity: String(obj?.rawEntity ?? ""),
        dictionary: (obj?.dictionary ?? {}) as Record<string, string>,
      };
      const result = normalizeEntityToCode(input);
      const report = buildNlpEntityNormalizeReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
