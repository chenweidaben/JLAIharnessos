/**
 * 健澜科技 jlmedaios - 患者安全事件总览 V13 路由（M322-B）
 *
 * GET /api/v1/patient-safety-overview
 *
 * 权限：patient-safety-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSafetyOverviewV13,
  type SafetyEventV13,
} from "../aggregators/patientSafetyV13Aggregator.js";

const currentEvents: SafetyEventV13[] = [
  { eventId: "e1", type: "fall" },
  { eventId: "e2", type: "fall" },
  { eventId: "e3", type: "fall" },
  { eventId: "e4", type: "fall" },
  { eventId: "e5", type: "fall" },
  { eventId: "e6", type: "fall" },
  { eventId: "e7", type: "fall" },
  { eventId: "e8", type: "bedsore" },
  { eventId: "e9", type: "bedsore" },
  { eventId: "e10", type: "bedsore" },
  { eventId: "e11", type: "bedsore" },
  { eventId: "e12", type: "bedsore" },
  { eventId: "e13", type: "medicationError" },
  { eventId: "e14", type: "medicationError" },
  { eventId: "e15", type: "medicationError" },
  { eventId: "e16", type: "surgicalComplication" },
  { eventId: "e17", type: "surgicalComplication" },
];

const lastYearEvents: SafetyEventV13[] = [
  { eventId: "l1", type: "fall" },
  { eventId: "l2", type: "fall" },
  { eventId: "l3", type: "fall" },
  { eventId: "l4", type: "fall" },
  { eventId: "l5", type: "fall" },
  { eventId: "l6", type: "fall" },
  { eventId: "l7", type: "fall" },
  { eventId: "l8", type: "fall" },
  { eventId: "l9", type: "fall" },
  { eventId: "l10", type: "fall" },
  { eventId: "l11", type: "bedsore" },
  { eventId: "l12", type: "bedsore" },
  { eventId: "l13", type: "bedsore" },
  { eventId: "l14", type: "bedsore" },
  { eventId: "l15", type: "bedsore" },
  { eventId: "l16", type: "bedsore" },
  { eventId: "l17", type: "bedsore" },
  { eventId: "l18", type: "bedsore" },
  { eventId: "l19", type: "medicationError" },
  { eventId: "l20", type: "medicationError" },
  { eventId: "l21", type: "medicationError" },
  { eventId: "l22", type: "medicationError" },
  { eventId: "l23", type: "medicationError" },
  { eventId: "l24", type: "surgicalComplication" },
  { eventId: "l25", type: "surgicalComplication" },
  { eventId: "l26", type: "surgicalComplication" },
  { eventId: "l27", type: "surgicalComplication" },
];

export const patientSafetyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-safety-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-safety-overview:read");
      if (denied) return denied;
      return json(ok(buildSafetyOverviewV13(currentEvents, lastYearEvents)));
    },
  },
];
