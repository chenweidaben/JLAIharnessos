/**
 * 健澜科技 jlmedaios - 手卫生依从性 V13 路由（M318-C）
 *
 * GET /api/v1/hand-hygiene-compliance?dept=
 *
 * 权限：hand-hygiene-compliance:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHygieneComplianceRateV13,
  flagLowComplianceV13,
  groupByDeptV13,
  type HygieneObservationV13,
} from "../aggregators/handHygieneComplianceV13Aggregator.js";

const observations: HygieneObservationV13[] = [
  { observationId: "o1", dept: "cardio", isCompliant: true },
  { observationId: "o2", dept: "cardio", isCompliant: true },
  { observationId: "o3", dept: "cardio", isCompliant: true },
  { observationId: "o4", dept: "cardio", isCompliant: true },
  { observationId: "o5", dept: "cardio", isCompliant: true },
  { observationId: "o6", dept: "cardio", isCompliant: true },
  { observationId: "o7", dept: "cardio", isCompliant: true },
  { observationId: "o8", dept: "cardio", isCompliant: true },
  { observationId: "o9", dept: "cardio", isCompliant: false },
  { observationId: "o10", dept: "cardio", isCompliant: false },
  { observationId: "o11", dept: "icu", isCompliant: true },
  { observationId: "o12", dept: "icu", isCompliant: true },
  { observationId: "o13", dept: "icu", isCompliant: true },
  { observationId: "o14", dept: "icu", isCompliant: true },
  { observationId: "o15", dept: "icu", isCompliant: true },
  { observationId: "o16", dept: "icu", isCompliant: true },
  { observationId: "o17", dept: "icu", isCompliant: true },
  { observationId: "o18", dept: "icu", isCompliant: false },
  { observationId: "o19", dept: "icu", isCompliant: false },
  { observationId: "o20", dept: "icu", isCompliant: false },
];

export const handHygieneComplianceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hand-hygiene-compliance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hand-hygiene-compliance:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const threshold = 80;
      const deptRates = groupByDeptV13(observations);
      return json(ok({
        dept,
        threshold,
        overallRate: computeHygieneComplianceRateV13(observations),
        deptRates: deptRates.map((d) => ({
          ...d,
          isLow: flagLowComplianceV13(d.rate, threshold),
        })),
      }));
    },
  },
];
