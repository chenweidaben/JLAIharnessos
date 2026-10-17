/**
 * 健澜科技 jlmedaios - 环境管理 V13 路由（M377-D，M377 收官）
 *
 * GET /api/v1/environment-mgmt
 *
 * 权限：environment-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEnvironmentMonitoringPassRateV13,
  computeMedicalWasteDisposalCountV13,
  computeSewageTreatmentComplianceRateV13,
  type EnvironmentMgmtRecordV13,
} from "../aggregators/environmentMgmtV13Aggregator.js";

const records: EnvironmentMgmtRecordV13[] = [
  { medicalWasteCount: 5, sewageTestCount: 100, sewagePassCount: 98, envMonitorCount: 100, envMonitorPassCount: 99 },
  { medicalWasteCount: 5, sewageTestCount: 100, sewagePassCount: 98, envMonitorCount: 100, envMonitorPassCount: 99 },
];

export const environmentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/environment-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "environment-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalWasteDisposalCount: computeMedicalWasteDisposalCountV13(records),
        sewageTreatmentComplianceRate: computeSewageTreatmentComplianceRateV13(records),
        environmentMonitoringPassRate: computeEnvironmentMonitoringPassRateV13(records),
      }));
    },
  },
];
