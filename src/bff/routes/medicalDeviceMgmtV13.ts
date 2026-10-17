/**
 * 健澜科技 jlmedaios - 医疗器械管理 V13 路由（M408-A）
 *
 * GET /api/v1/medical-device-mgmt
 *
 * 权限：medical-device-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalDeviceInspectionPassRateV13,
  computeMedicalDeviceIntegrityRateV13,
  computeMetrologicalTestPassRateV13,
  type MedicalDeviceMgmtRecordV13,
} from "../aggregators/medicalDeviceMgmtV13Aggregator.js";

const records: MedicalDeviceMgmtRecordV13[] = [
  { intact: 980, total: 1000, inspPass: 970, inspTotal: 1000, metPass: 990, metTotal: 1000 },
  { intact: 980, total: 1000, inspPass: 970, inspTotal: 1000, metPass: 990, metTotal: 1000 },
];

export const medicalDeviceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-device-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-device-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalDeviceIntegrityRate: computeMedicalDeviceIntegrityRateV13(records),
        medicalDeviceInspectionPassRate: computeMedicalDeviceInspectionPassRateV13(records),
        metrologicalTestPassRate: computeMetrologicalTestPassRateV13(records),
      }));
    },
  },
];
