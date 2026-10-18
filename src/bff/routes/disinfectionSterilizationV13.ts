/**
 * 健澜科技 jlmedaios - 消毒灭菌管理 V13 路由（M441-C，医院感染管理组）
 *
 * GET /api/v1/disinfection-sterilization
 *
 * 权限：disinfection-sterilization:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDisinfectionQualifiedRateV13,
  computeEndoscopeDisinfectionQualifiedRateV13,
  computeSterilizationQualifiedRateV13,
  type DisinfectionSterilizationRecordV13,
} from "../aggregators/disinfectionSterilizationV13Aggregator.js";

const records: DisinfectionSterilizationRecordV13[] = [
  { disinfectionQualified: 950, disinfectionTotal: 1000, sterilizationQualified: 980, sterilizationTotal: 1000, endoscopeQualified: 900, endoscopeTotal: 1000 },
  { disinfectionQualified: 950, disinfectionTotal: 1000, sterilizationQualified: 980, sterilizationTotal: 1000, endoscopeQualified: 900, endoscopeTotal: 1000 },
];

export const disinfectionSterilizationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/disinfection-sterilization",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "disinfection-sterilization:read");
      if (denied) return denied;
      return json(ok({
        disinfectionQualifiedRate: computeDisinfectionQualifiedRateV13(records),
        sterilizationQualifiedRate: computeSterilizationQualifiedRateV13(records),
        endoscopeDisinfectionQualifiedRate: computeEndoscopeDisinfectionQualifiedRateV13(records),
      }));
    },
  },
];
