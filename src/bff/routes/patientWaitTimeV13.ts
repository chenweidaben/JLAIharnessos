/**
 * 健澜科技 jlmedaios - 患者等候时长 V13 路由（M326-A）
 *
 * GET /api/v1/patient-wait-time
 *
 * 权限：patient-wait-time:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildWaitTimeOverviewV13,
  type WaitTimeRecordV13,
} from "../aggregators/patientWaitTimeV13Aggregator.js";

const records: WaitTimeRecordV13[] = [
  { stage: "registration", minutes: 3 },
  { stage: "registration", minutes: 4 },
  { stage: "registration", minutes: 5 },
  { stage: "registration", minutes: 6 },
  { stage: "registration", minutes: 7 },
  { stage: "waiting", minutes: 25 },
  { stage: "waiting", minutes: 30 },
  { stage: "waiting", minutes: 20 },
  { stage: "waiting", minutes: 35 },
  { stage: "waiting", minutes: 40 },
  { stage: "payment", minutes: 5 },
  { stage: "payment", minutes: 8 },
  { stage: "payment", minutes: 10 },
  { stage: "payment", minutes: 12 },
  { stage: "payment", minutes: 15 },
  { stage: "pharmacy", minutes: 10 },
  { stage: "pharmacy", minutes: 15 },
  { stage: "pharmacy", minutes: 20 },
  { stage: "pharmacy", minutes: 25 },
  { stage: "pharmacy", minutes: 30 },
];

export const patientWaitTimeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-wait-time",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-wait-time:read");
      if (denied) return denied;
      return json(ok(buildWaitTimeOverviewV13(records)));
    },
  },
];
