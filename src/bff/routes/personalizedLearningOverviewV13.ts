/**
 * 健澜科技 jlmedaios - 个人化学习效果总览 V13 路由（M303-D）
 *
 * GET /api/v1/personalized-learning-overview
 *
 * 权限：personalized-learning-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPersonalizedLearningOverviewV13,
  computePersonalizationMaturityV13,
  identifyPersonalizationGapV13,
  type PersonalizedDoctorV13,
} from "../aggregators/personalizedLearningOverviewV13Aggregator.js";

const doctors: PersonalizedDoctorV13[] = [
  { doctorId: "dr-zhang", active: true, adoptionRate: 40, slope: 22, coldStart: false, plateau: false },
  { doctorId: "dr-li", active: true, adoptionRate: 30, slope: 5, coldStart: false, plateau: false },
  { doctorId: "dr-wang", active: true, adoptionRate: 35, slope: 10, coldStart: false, plateau: false },
  { doctorId: "dr-new1", active: false, adoptionRate: 0, slope: 0, coldStart: true, plateau: false },
  { doctorId: "dr-new2", active: false, adoptionRate: 0, slope: 0, coldStart: true, plateau: false },
];

export const personalizedLearningOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/personalized-learning-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "personalized-learning-overview:read");
      if (denied) return denied;
      const overview = buildPersonalizedLearningOverviewV13(doctors);
      return json(ok({
        ...overview,
        maturity: computePersonalizationMaturityV13(overview, doctors.length),
        gap: identifyPersonalizationGapV13(overview),
      }));
    },
  },
];
