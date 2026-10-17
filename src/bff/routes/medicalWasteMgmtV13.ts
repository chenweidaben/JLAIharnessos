/**
 * 健澜科技 jlmedaios - 医疗废物 V13 路由（M393-C）
 *
 * GET /api/v1/medical-waste-mgmt
 *
 * 权限：medical-waste-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHandoverRegistrationRateV13,
  computeMedicalWasteClassificationRateV13,
  computeTemporaryStorageDisinfectionRateV13,
  type MedicalWasteMgmtRecordV13,
} from "../aggregators/medicalWasteMgmtV13Aggregator.js";

const records: MedicalWasteMgmtRecordV13[] = [
  { correctCount: 950, totalCount: 1000, registeredCount: 980, registeredShouldCount: 1000, disinfectedCount: 900, disinfectedShouldCount: 1000 },
  { correctCount: 950, totalCount: 1000, registeredCount: 980, registeredShouldCount: 1000, disinfectedCount: 900, disinfectedShouldCount: 1000 },
];

export const medicalWasteMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-waste-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-waste-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalWasteClassificationRate: computeMedicalWasteClassificationRateV13(records),
        handoverRegistrationRate: computeHandoverRegistrationRateV13(records),
        temporaryStorageDisinfectionRate: computeTemporaryStorageDisinfectionRateV13(records),
      }));
    },
  },
];
