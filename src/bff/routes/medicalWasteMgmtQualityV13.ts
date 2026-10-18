/**
 * 健澜科技 jlmedaios - 医疗废物质量管理 V13 路由（M441-D，M441 收官，医院感染管理组）
 *
 * GET /api/v1/medical-waste-mgmt-quality
 *
 * 权限：medical-waste-mgmt-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalWasteClassificationAccuracyRateV13,
  computeMedicalWasteHandoverComplianceRateV13,
  computeMedicalWasteStorageComplianceRateV13,
  type MedicalWasteMgmtQualityRecordV13,
} from "../aggregators/medicalWasteMgmtQualityV13Aggregator.js";

const records: MedicalWasteMgmtQualityRecordV13[] = [
  { classificationAccurate: 950, classificationTotal: 1000, handoverCompliant: 980, handoverTotal: 1000, storageCompliant: 900, storageTotal: 1000 },
  { classificationAccurate: 950, classificationTotal: 1000, handoverCompliant: 980, handoverTotal: 1000, storageCompliant: 900, storageTotal: 1000 },
];

export const medicalWasteMgmtQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-waste-mgmt-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-waste-mgmt-quality:read");
      if (denied) return denied;
      return json(ok({
        medicalWasteClassificationAccuracyRate: computeMedicalWasteClassificationAccuracyRateV13(records),
        medicalWasteHandoverComplianceRate: computeMedicalWasteHandoverComplianceRateV13(records),
        medicalWasteStorageComplianceRate: computeMedicalWasteStorageComplianceRateV13(records),
      }));
    },
  },
];
