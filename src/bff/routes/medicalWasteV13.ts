/**
 * 健澜科技 jlmedaios - 医疗废物 V13 路由（M351-D，M351 收官）
 *
 * GET /api/v1/medical-waste
 *
 * 权限：medical-waste:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHandoverRegisterRateV13,
  computeSortCollectionRateV13,
  computeStorageTimeoutRateV13,
  type MedicalWasteRecordV13,
} from "../aggregators/medicalWasteV13Aggregator.js";

const records: MedicalWasteRecordV13[] = [
  { sortedCount: 98, totalCount: 100, registeredCount: 100, handedOverCount: 100, timeoutCount: 2, storedCount: 100 },
  { sortedCount: 98, totalCount: 100, registeredCount: 100, handedOverCount: 100, timeoutCount: 3, storedCount: 100 },
];

export const medicalWasteV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-waste",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-waste:read");
      if (denied) return denied;
      return json(ok({
        sortCollectionRate: computeSortCollectionRateV13(records),
        handoverRegisterRate: computeHandoverRegisterRateV13(records),
        storageTimeoutRate: computeStorageTimeoutRateV13(records),
      }));
    },
  },
];
