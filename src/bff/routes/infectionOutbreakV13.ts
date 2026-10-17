/**
 * 健澜科技 jlmedaios - 院感暴发早期预警 V13 路由（M313-D）
 *
 * GET /api/v1/infection-outbreak?threshold=
 *
 * 权限：infection-outbreak:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildOutbreakMatrixV13,
  countDeptPathogenV13,
  detectOutbreakV13,
  type InfectionCaseV13,
} from "../aggregators/infectionOutbreakV13Aggregator.js";

const cases: InfectionCaseV13[] = [
  { caseId: "i1", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i2", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i3", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i4", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i5", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i6", dept: "surgery", pathogen: "CRE" },
  { caseId: "i7", dept: "surgery", pathogen: "CRE" },
];

export const infectionOutbreakV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infection-outbreak",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infection-outbreak:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const threshold = Number(url.searchParams.get("threshold") ?? "3");
      const matrix = countDeptPathogenV13(cases);
      const outbreaks = detectOutbreakV13(matrix, threshold);
      return json(ok({
        threshold,
        outbreaks,
        matrix: buildOutbreakMatrixV13(matrix, outbreaks),
      }));
    },
  },
];
