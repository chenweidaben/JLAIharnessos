/**
 * 健澜科技 jlmedaios - 手卫生依从率 V13 路由（M341-A）
 *
 * GET /api/v1/hand-hygiene
 *
 * 权限：hand-hygiene:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCompliantCountV13,
  computeComplianceRateV13,
  computeObservationCountV13,
  type HandHygieneRecordV13,
} from "../aggregators/handHygieneV13Aggregator.js";

const records: HandHygieneRecordV13[] = [
  { observationCount: 200, compliantCount: 180 },
];

export const handHygieneV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hand-hygiene",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hand-hygiene:read");
      if (denied) return denied;
      return json(ok({
        observationCount: computeObservationCountV13(records),
        compliantCount: computeCompliantCountV13(records),
        complianceRate: computeComplianceRateV13(records),
      }));
    },
  },
];
