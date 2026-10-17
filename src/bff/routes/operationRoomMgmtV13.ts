/**
 * 健澜科技 jlmedaios - 手术室管理 V13 路由（M417-C）
 *
 * GET /api/v1/operation-room-mgmt
 *
 * 权限：operation-room-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOperationRoomAverageWaitMinutesV13,
  computeOperationRoomEnvironmentSamplingPassRateV13,
  computeOperationRoomUtilizationRateV13,
  type OperationRoomMgmtRecordV13,
} from "../aggregators/operationRoomMgmtV13Aggregator.js";

const records: OperationRoomMgmtRecordV13[] = [
  { waitMinutes: 12.5, usedHours: 480, shouldUseHours: 600, sampleQualified: 95, sampleTotal: 100 },
  { waitMinutes: 14.3, usedHours: 480, shouldUseHours: 600, sampleQualified: 95, sampleTotal: 100 },
];

export const operationRoomMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operation-room-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operation-room-mgmt:read");
      if (denied) return denied;
      return json(ok({
        operationRoomAverageWaitMinutes: computeOperationRoomAverageWaitMinutesV13(records),
        operationRoomUtilizationRate: computeOperationRoomUtilizationRateV13(records),
        operationRoomEnvironmentSamplingPassRate: computeOperationRoomEnvironmentSamplingPassRateV13(records),
      }));
    },
  },
];
