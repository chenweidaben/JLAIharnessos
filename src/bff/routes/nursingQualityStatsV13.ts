/**
 * 健澜科技 jlmedaios - 护理质量（统计）V13 路由（M369-A，stats避让）
 *
 * GET /api/v1/nursing-quality-stats
 *
 * 权限：nursing-quality-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBasicNursingPassRateV13,
  computeNursingPassRateV13,
  computeSpecialNursingPassRateV13,
  type NursingQualityStatsRecordV13,
} from "../aggregators/nursingQualityStatsV13Aggregator.js";

const records: NursingQualityStatsRecordV13[] = [
  { totalCheck: 100, totalPass: 95, basicCheck: 100, basicPass: 90, specialCheck: 100, specialPass: 98 },
  { totalCheck: 100, totalPass: 95, basicCheck: 100, basicPass: 90, specialCheck: 100, specialPass: 98 },
];

export const nursingQualityStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-quality-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-quality-stats:read");
      if (denied) return denied;
      return json(ok({
        nursingPassRate: computeNursingPassRateV13(records),
        basicNursingPassRate: computeBasicNursingPassRateV13(records),
        specialNursingPassRate: computeSpecialNursingPassRateV13(records),
      }));
    },
  },
];
