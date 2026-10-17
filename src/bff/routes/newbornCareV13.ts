/**
 * 健澜科技 jlmedaios - 新生儿 V13 路由（M349-B）
 *
 * GET /api/v1/newborn-care
 *
 * 权限：newborn-care:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeLowApgarRatioV13,
  computeLowBirthWeightRatioV13,
  computeNICUTransferRatioV13,
  type NewbornCareRecordV13,
} from "../aggregators/newbornCareV13Aggregator.js";

const records: NewbornCareRecordV13[] = [
  { lowApgarCount: 3, lowBirthWeightCount: 3, nicuTransferCount: 2, totalNewbornCount: 50 },
  { lowApgarCount: 2, lowBirthWeightCount: 2, nicuTransferCount: 1, totalNewbornCount: 50 },
];

export const newbornCareV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/newborn-care",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "newborn-care:read");
      if (denied) return denied;
      return json(ok({
        lowApgarRatio: computeLowApgarRatioV13(records),
        lowBirthWeightRatio: computeLowBirthWeightRatioV13(records),
        nicuTransferRatio: computeNICUTransferRatioV13(records),
      }));
    },
  },
];
