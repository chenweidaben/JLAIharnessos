/**
 * 健澜科技 jlmedaios - 实验室生物安全质量管理 V13 路由（M436-C，院感安全环保质量管理深化组）
 *
 * GET /api/v1/lab-biosafety-quality-mgmt
 *
 * 权限：lab-biosafety-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeLabBiosafetyCabinetQualifiedRateV13,
  computeLabBiosafetyIncidentCountV13,
  computeLabBiosafetyStrainManagementComplianceRateV13,
  type LabBiosafetyQualityMgmtRecordV13,
} from "../aggregators/labBiosafetyQualityMgmtV13Aggregator.js";

const records: LabBiosafetyQualityMgmtRecordV13[] = [
  { incidentCount: 2, qualifiedCabinets: 980, totalCabinets: 1000, compliantItems: 950, totalItems: 1000 },
  { incidentCount: 2, qualifiedCabinets: 980, totalCabinets: 1000, compliantItems: 950, totalItems: 1000 },
];

export const labBiosafetyQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/lab-biosafety-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "lab-biosafety-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        labBiosafetyIncidentCount: computeLabBiosafetyIncidentCountV13(records),
        labBiosafetyCabinetQualifiedRate: computeLabBiosafetyCabinetQualifiedRateV13(records),
        labBiosafetyStrainManagementComplianceRate: computeLabBiosafetyStrainManagementComplianceRateV13(records),
      }));
    },
  },
];
