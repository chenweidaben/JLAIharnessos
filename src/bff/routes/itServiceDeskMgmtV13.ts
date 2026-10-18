/**
 * 健澜科技 jlmedaios - 信息运维服务管理 V13 路由（M446-D，M446 收官，信息化建设与数据安全管理组）
 *
 * GET /api/v1/it-service-desk-mgmt
 *
 * 权限：it-service-desk-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeItServiceDeskResolutionRateV13,
  computeItServiceDeskResponseTimelinessRateV13,
  computeItServiceDeskTerminalRepairMinutesV13,
  type ItServiceDeskMgmtRecordV13,
} from "../aggregators/itServiceDeskMgmtV13Aggregator.js";

const records: ItServiceDeskMgmtRecordV13[] = [
  { timelyResponse: 950, totalTicket: 1000, resolved: 900, avgRepairMinutes: 15.5 },
  { timelyResponse: 950, totalTicket: 1000, resolved: 900, avgRepairMinutes: 15.5 },
];

export const itServiceDeskMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/it-service-desk-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "it-service-desk-mgmt:read");
      if (denied) return denied;
      return json(ok({
        itServiceDeskResponseTimelinessRate: computeItServiceDeskResponseTimelinessRateV13(records),
        itServiceDeskResolutionRate: computeItServiceDeskResolutionRateV13(records),
        itServiceDeskTerminalRepairMinutes: computeItServiceDeskTerminalRepairMinutesV13(records),
      }));
    },
  },
];
