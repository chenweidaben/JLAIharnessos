/**
 * 健澜科技 jlmedaios - 医废追溯质量管理 V13 路由（M436-D，M436 收官，-quality 后缀避让旧版 medicalWasteTraceabilityMgmtV13（M423））
 *
 * GET /api/v1/medical-waste-traceability-quality-mgmt
 *
 * 权限：medical-waste-traceability-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalWasteClassificationAccuracyRateV13,
  computeMedicalWasteDisposalTimelinessRateV13,
  computeMedicalWasteHandoverCompletenessRateV13,
  type MedicalWasteTraceabilityQualityMgmtRecordV13,
} from "../aggregators/medicalWasteTraceabilityQualityMgmtV13Aggregator.js";

const records: MedicalWasteTraceabilityQualityMgmtRecordV13[] = [
  { accurateClassified: 980, totalWaste: 1000, completeHandover: 950, totalHandover: 1000, timelyDisposal: 900, shouldDisposal: 1000 },
  { accurateClassified: 980, totalWaste: 1000, completeHandover: 950, totalHandover: 1000, timelyDisposal: 900, shouldDisposal: 1000 },
];

export const medicalWasteTraceabilityQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-waste-traceability-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-waste-traceability-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalWasteClassificationAccuracyRate: computeMedicalWasteClassificationAccuracyRateV13(records),
        medicalWasteHandoverCompletenessRate: computeMedicalWasteHandoverCompletenessRateV13(records),
        medicalWasteDisposalTimelinessRate: computeMedicalWasteDisposalTimelinessRateV13(records),
      }));
    },
  },
];
