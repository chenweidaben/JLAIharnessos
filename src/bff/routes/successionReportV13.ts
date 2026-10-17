/**
 * 健澜科技 jlmedaios - 传承效果度量与院长报告 V13 路由（M297-D）
 *
 * GET /api/v1/succession-report?handoverId=
 *
 * 权限：succession-report:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSuccessionReportV13,
  computeKnowledgeContinuityV13,
  measureHandoverEffectV13,
  type QualityCaseV13,
  type ReuseLogV13,
  type StudyPlanMiniV13,
} from "../aggregators/successionReportV13Aggregator.js";

const plan: StudyPlanMiniV13 = { totalItems: 10, studiedItems: 8, avgStudyScore: 85 };

const reuseLogs: ReuseLogV13[] = [
  { reuseId: "r-1", experienceId: "e-1" },
  { reuseId: "r-2", experienceId: "e-2" },
  { reuseId: "r-3", experienceId: "e-3" },
];

const prevCases: QualityCaseV13[] = [
  { caseId: "c-1", qualityScore: 90 },
  { caseId: "c-2", qualityScore: 80 },
];

const newCases: QualityCaseV13[] = [
  { caseId: "n-1", qualityScore: 88 },
  { caseId: "n-2", qualityScore: 82 },
];

export const successionReportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/succession-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "succession-report:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const handoverId = url.searchParams.get("handoverId") ?? "pkg-zhang-li";
      void handoverId;
      const effect = measureHandoverEffectV13(plan, reuseLogs);
      const continuity = computeKnowledgeContinuityV13(prevCases, newCases);
      return json(ok(buildSuccessionReportV13(effect, continuity)));
    },
  },
];
