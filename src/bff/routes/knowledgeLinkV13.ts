/**
 * 健澜科技 jlmedaios - 病历知识自动关联 V13 路由（M319-C）
 *
 * GET /api/v1/knowledge-link?caseId=
 *
 * 权限：knowledge-link:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeLinkHitRateV13,
  linkRelatedSOPsV13,
  linkSimilarCasesV13,
  type MedicalCaseV13,
  type SopItemV13,
} from "../aggregators/knowledgeLinkV13Aggregator.js";

const currentCase: MedicalCaseV13 = { caseId: "c1", diagnosis: "急性心肌梗死" };

const history: MedicalCaseV13[] = [
  { caseId: "h1", diagnosis: "急性心肌梗死" },
  { caseId: "h2", diagnosis: "陈旧性心肌梗死" },
  { caseId: "h3", diagnosis: "心绞痛" },
  { caseId: "h4", diagnosis: "急性心肌梗死合并心衰" },
  { caseId: "h5", diagnosis: "肺炎" },
];

const sops: SopItemV13[] = [
  { sopId: "s1", title: "急性心梗诊疗 SOP", keywords: ["心肌梗死", "心梗"] },
  { sopId: "s2", title: "心衰诊疗 SOP", keywords: ["心衰"] },
  { sopId: "s3", title: "肺炎诊疗 SOP", keywords: ["肺炎"] },
];

export const knowledgeLinkV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/knowledge-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-link:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const caseId = url.searchParams.get("caseId") ?? "c1";
      const similarCases = linkSimilarCasesV13(currentCase, history);
      const relatedSOPs = linkRelatedSOPsV13(currentCase, sops);
      const attempts = 5;
      const successes = similarCases.length + relatedSOPs.length;
      return json(ok({
        caseId,
        similarCases,
        relatedSOPs,
        hitRate: computeLinkHitRateV13(attempts, successes),
      }));
    },
  },
];
