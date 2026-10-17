/**
 * 健澜科技 jlmedaios - 便民服务 V13 路由（M378-D，M378 收官）
 *
 * GET /api/v1/convenience-service
 *
 * 权限：convenience-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConvenienceCabinetUsageCountV13,
  computeReportPrintCountV13,
  computeSelfServiceMachineUsageCountV13,
  type ConvenienceServiceRecordV13,
} from "../aggregators/convenienceServiceV13Aggregator.js";

const records: ConvenienceServiceRecordV13[] = [
  { selfServiceMachineCount: 500, reportPrintCount: 300, convenienceCabinetCount: 200 },
  { selfServiceMachineCount: 500, reportPrintCount: 300, convenienceCabinetCount: 200 },
];

export const convenienceServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/convenience-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "convenience-service:read");
      if (denied) return denied;
      return json(ok({
        selfServiceMachineUsageCount: computeSelfServiceMachineUsageCountV13(records),
        reportPrintCount: computeReportPrintCountV13(records),
        convenienceCabinetUsageCount: computeConvenienceCabinetUsageCountV13(records),
      }));
    },
  },
];
