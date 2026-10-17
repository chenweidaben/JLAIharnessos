/**
 * 健澜科技 jlmedaios - 疗效证据总览 V13 路由（M300-D）
 *
 * GET /api/v1/evidence-overview
 *
 * 权限：evidence-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEvidenceOverviewV13,
  computeEvidenceCoverageV13,
  identifyEvidenceGapV13,
  type CircuitBreakItemV13,
  type EvidenceRankItemV13,
  type EvidenceRuleItemV13,
} from "../aggregators/evidenceOverviewV13Aggregator.js";

const ranks: EvidenceRankItemV13[] = [
  { experienceId: "e-1", effectSize: -12, strength: "strong" },
  { experienceId: "e-2", effectSize: -8, strength: "moderate" },
  { experienceId: "e-3", effectSize: -3, strength: "weak" },
  { experienceId: "e-4", effectSize: 1, strength: "inconclusive" },
];

const rules: EvidenceRuleItemV13[] = [
  { experienceId: "e-1", evidenceLevel: "strong" },
  { experienceId: "e-2", evidenceLevel: "moderate" },
  { experienceId: "e-3", evidenceLevel: "weak" },
  { experienceId: "e-4", evidenceLevel: "inconclusive" },
];

const circuitBreaks: CircuitBreakItemV13[] = [
  { experienceId: "e-x1" },
];

export const evidenceOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/evidence-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "evidence-overview:read");
      if (denied) return denied;
      const overview = buildEvidenceOverviewV13(ranks, rules, circuitBreaks);
      const strongRules = rules.filter((r) => r.evidenceLevel === "strong").length;
      return json(ok({
        ...overview,
        coverage: computeEvidenceCoverageV13(strongRules, rules.length),
        gap: identifyEvidenceGapV13(overview),
      }));
    },
  },
];
