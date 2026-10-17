/**
 * 健澜科技 jlmedaios - 经验与临床结局关联 V13 路由（M300-A）
 *
 * GET /api/v1/experience-outcome?experienceId=
 *
 * 权限：experience-outcome:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEffectSizeV13,
  linkExperienceToOutcomeV13,
  rankEvidenceV13,
  type EvidenceExpV13,
  type PatientOutcomeV13,
} from "../aggregators/experienceOutcomeV13Aggregator.js";

const outcomes: PatientOutcomeV13[] = [
  { patientId: "p-1", experienceId: "e-1", complicationRate: 5 },
  { patientId: "p-2", experienceId: "e-1", complicationRate: 3 },
  { patientId: "p-3", experienceId: null, complicationRate: 8 },
  { patientId: "p-4", experienceId: null, complicationRate: 6 },
];

const evidence: EvidenceExpV13[] = [
  { experienceId: "e-1", effectSize: -3 },
  { experienceId: "e-2", effectSize: -12 },
  { experienceId: "e-3", effectSize: 1 },
];

export const experienceOutcomeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/experience-outcome",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-outcome:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const eid = url.searchParams.get("experienceId") ?? "e-1";
      const linked = linkExperienceToOutcomeV13(eid, outcomes);
      const effect = computeEffectSizeV13(linked.usedPatients, linked.controlPatients);
      return json(ok({
        ...linked,
        effectSize: effect,
        evidenceRanking: rankEvidenceV13(evidence),
      }));
    },
  },
];
