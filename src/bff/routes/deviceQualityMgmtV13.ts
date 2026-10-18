/**
 * 健澜科技 jlmedaios - 设备质量管理 V13 路由（M431-B，-quality 后缀避让旧版 medicalDeviceDetailV13（M418））
 *
 * GET /api/v1/device-quality-mgmt
 *
 * 权限：device-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeviceCompletenessRateV13,
  computeDeviceFailureRateV13,
  computeDeviceUtilizationRateV13,
  type DeviceQualityMgmtRecordV13,
} from "../aggregators/deviceQualityMgmtV13Aggregator.js";

const records: DeviceQualityMgmtRecordV13[] = [
  { intact: 980, failure: 20, deviceTotal: 1000, actualHours: 1800, requiredHours: 2000 },
  { intact: 980, failure: 20, deviceTotal: 1000, actualHours: 1800, requiredHours: 2000 },
];

export const deviceQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/device-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "device-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        deviceCompletenessRate: computeDeviceCompletenessRateV13(records),
        deviceFailureRate: computeDeviceFailureRateV13(records),
        deviceUtilizationRate: computeDeviceUtilizationRateV13(records),
      }));
    },
  },
];
