/**
 * 健澜科技 jlmedaios - 护理交班质量 V13 路由（M315-D）
 *
 * GET /api/v1/nursing-handover?patientId=
 *
 * 权限：nursing-handover:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSbarCompletenessV13,
  gradeHandoverQualityV13,
  identifyHandoverOmissionsV13,
  type NursingHandoverV13,
} from "../aggregators/nursingHandoverV13Aggregator.js";

const handover: NursingHandoverV13 = {
  patientId: "p1",
  s: "床号 12",
  b: "急性心肌梗死",
  a: "心电监护中",
  r: "",
  pressureUlcerHandedOver: true,
  fallHandedOver: false,
  vteHandedOver: true,
};

export const nursingHandoverV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-handover",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-handover:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const patientId = url.searchParams.get("patientId") ?? handover.patientId;
      const score = computeSbarCompletenessV13(handover);
      return json(ok({
        patientId,
        score,
        grade: gradeHandoverQualityV13(score),
        omissions: identifyHandoverOmissionsV13(handover),
      }));
    },
  },
];
