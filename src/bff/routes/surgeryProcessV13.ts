/**
 * 健澜科技 jlmedaios - 手术过程 V13 路由（M391-A）
 *
 * GET /api/v1/surgery-process
 *
 * 权限：surgery-process:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIntraoperativeAdverseEventCountV13,
  computeSurgeryOnTimeEndRateV13,
  computeSurgeryOnTimeStartRateV13,
  type SurgeryProcessRecordV13,
} from "../aggregators/surgeryProcessV13Aggregator.js";

const records: SurgeryProcessRecordV13[] = [
  { onTimeStartCount: 900, onTimeEndCount: 950, surgeryTotalCount: 1000, adverseEventCount: 5 },
  { onTimeStartCount: 900, onTimeEndCount: 950, surgeryTotalCount: 1000, adverseEventCount: 5 },
];

export const surgeryProcessV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/surgery-process",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "surgery-process:read");
      if (denied) return denied;
      return json(ok({
        surgeryOnTimeStartRate: computeSurgeryOnTimeStartRateV13(records),
        surgeryOnTimeEndRate: computeSurgeryOnTimeEndRateV13(records),
        intraoperativeAdverseEventCount: computeIntraoperativeAdverseEventCountV13(records),
      }));
    },
  },
];
