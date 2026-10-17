/**
 * 健澜科技 jlmedaios - 器械管理 V13 路由（M391-D，M391 收官）
 *
 * GET /api/v1/instrument-mgmt
 *
 * 权限：instrument-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInstrumentTraceabilityRateV13,
  computeSterilizationQualificationRateV13,
  computeSurgeryInstrumentPackQualificationRateV13,
  type InstrumentMgmtRecordV13,
} from "../aggregators/instrumentMgmtV13Aggregator.js";

const records: InstrumentMgmtRecordV13[] = [
  { qualifiedPackCount: 990, totalPackCount: 1000, qualifiedSterilizeCount: 980, totalSterilizeCount: 1000, traceableCount: 950, totalInstrumentCount: 1000 },
  { qualifiedPackCount: 990, totalPackCount: 1000, qualifiedSterilizeCount: 980, totalSterilizeCount: 1000, traceableCount: 950, totalInstrumentCount: 1000 },
];

export const instrumentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/instrument-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "instrument-mgmt:read");
      if (denied) return denied;
      return json(ok({
        surgeryInstrumentPackQualificationRate: computeSurgeryInstrumentPackQualificationRateV13(records),
        sterilizationQualificationRate: computeSterilizationQualificationRateV13(records),
        instrumentTraceabilityRate: computeInstrumentTraceabilityRateV13(records),
      }));
    },
  },
];
