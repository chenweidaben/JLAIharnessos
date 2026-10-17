/**
 * 健澜科技 jlmedaios - 产科质量 V13 路由（M349-A）
 *
 * GET /api/v1/maternity-quality
 *
 * 权限：maternity-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCesareanRateV13,
  computeEpisiotomyRateV13,
  computePostpartumHemorrhageRateV13,
  type MaternityQualityRecordV13,
} from "../aggregators/maternityQualityV13Aggregator.js";

const records: MaternityQualityRecordV13[] = [
  { cesareanCount: 15, totalDeliveryCount: 50, episiotomyCount: 10, vaginalDeliveryCount: 35, postpartumHemorrhageCount: 2 },
  { cesareanCount: 15, totalDeliveryCount: 50, episiotomyCount: 10, vaginalDeliveryCount: 35, postpartumHemorrhageCount: 3 },
];

export const maternityQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/maternity-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "maternity-quality:read");
      if (denied) return denied;
      return json(ok({
        cesareanRate: computeCesareanRateV13(records),
        episiotomyRate: computeEpisiotomyRateV13(records),
        postpartumHemorrhageRate: computePostpartumHemorrhageRateV13(records),
      }));
    },
  },
];
