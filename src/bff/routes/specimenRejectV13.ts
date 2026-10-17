/**
 * 健澜科技 jlmedaios - 标本不合格率 V13 路由（M338-D）
 *
 * GET /api/v1/specimen-reject
 *
 * 权限：specimen-reject:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSpecimenRejectRateV13,
  type SpecimenRejectRecordV13,
} from "../aggregators/specimenRejectV13Aggregator.js";

const records: SpecimenRejectRecordV13[] = [
  { totalSpecimens: 1000, rejectedSpecimens: 20 },
];

export const specimenRejectV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/specimen-reject",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "specimen-reject:read");
      if (denied) return denied;
      return json(ok({
        rejectRate: computeSpecimenRejectRateV13(records),
      }));
    },
  },
];
