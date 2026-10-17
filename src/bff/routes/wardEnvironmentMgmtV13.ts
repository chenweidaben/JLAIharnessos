/**
 * 健澜科技 jlmedaios - 病房环境管理 V13 路由（M426-D，M426 收官，换名避让旧版 wardMgmtDetailV13（M417））
 *
 * GET /api/v1/ward-environment-mgmt
 *
 * 权限：ward-environment-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePatientCallResponseMinutesV13,
  computeWardEnvironmentPassRateV13,
  computeWardPatrolArriveRateV13,
  type WardEnvironmentMgmtRecordV13,
} from "../aggregators/wardEnvironmentMgmtV13Aggregator.js";

const records: WardEnvironmentMgmtRecordV13[] = [
  { patrolArrived: 980, shouldPatrol: 1000, envPass: 950, envTotal: 1000, respMinutes: 4.2 },
  { patrolArrived: 980, shouldPatrol: 1000, envPass: 950, envTotal: 1000, respMinutes: 5.5 },
];

export const wardEnvironmentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ward-environment-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ward-environment-mgmt:read");
      if (denied) return denied;
      return json(ok({
        wardPatrolArriveRate: computeWardPatrolArriveRateV13(records),
        wardEnvironmentPassRate: computeWardEnvironmentPassRateV13(records),
        patientCallResponseMinutes: computePatientCallResponseMinutesV13(records),
      }));
    },
  },
];
