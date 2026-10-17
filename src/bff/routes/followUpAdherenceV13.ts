/**
 * 健澜科技 jlmedaios - 出院随访依从性 V13 路由（M316-A）
 *
 * GET /api/v1/follow-up-adherence?dept=
 *
 * 权限：follow-up-adherence:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFollowUpAdherenceScoreV13,
  computeFollowUpRatesV13,
  identifyLostToFollowUpV13,
  type FollowUpPatientV13,
} from "../aggregators/followUpAdherenceV13Aggregator.js";

const patients: FollowUpPatientV13[] = [
  { patientId: "p1", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p2", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p3", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p4", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p5", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p6", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p7", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p8", dept: "cardio", shouldFollowUp: true, isFollowedUp: false },
  { patientId: "p9", dept: "cardio", shouldFollowUp: true, isFollowedUp: false },
  { patientId: "p10", dept: "cardio", shouldFollowUp: true, isFollowedUp: false },
];

export const followUpAdherenceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/follow-up-adherence",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "follow-up-adherence:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const deptPatients = patients.filter((p) => p.dept === dept);
      return json(ok({
        dept,
        rates: computeFollowUpRatesV13(deptPatients),
        adherence: computeFollowUpAdherenceScoreV13(deptPatients),
        lostPatients: identifyLostToFollowUpV13(deptPatients),
      }));
    },
  },
];
