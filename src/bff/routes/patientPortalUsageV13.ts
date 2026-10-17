/**
 * 健澜科技 jlmedaios - 患者门户使用度 V13 路由（M316-D）
 *
 * GET /api/v1/patient-portal-usage
 *
 * 权限：patient-portal-usage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFeatureUsageRatesV13,
  computeMonthlyActiveRateV13,
  identifyLowUsagePatientsV13,
  type PortalUserV13,
} from "../aggregators/patientPortalUsageV13Aggregator.js";

const users: PortalUserV13[] = [
  { userId: "u1", isMonthlyActive: true, usedAppointment: true, usedReportQuery: true, usedOnlinePayment: false, usedMessageCenter: true, daysSinceLastLogin: 5 },
  { userId: "u2", isMonthlyActive: true, usedAppointment: true, usedReportQuery: true, usedOnlinePayment: false, usedMessageCenter: true, daysSinceLastLogin: 3 },
  { userId: "u3", isMonthlyActive: true, usedAppointment: true, usedReportQuery: true, usedOnlinePayment: false, usedMessageCenter: true, daysSinceLastLogin: 7 },
  { userId: "u4", isMonthlyActive: true, usedAppointment: true, usedReportQuery: true, usedOnlinePayment: false, usedMessageCenter: true, daysSinceLastLogin: 10 },
  { userId: "u5", isMonthlyActive: true, usedAppointment: true, usedReportQuery: true, usedOnlinePayment: true, usedMessageCenter: true, daysSinceLastLogin: 2 },
  { userId: "u6", isMonthlyActive: true, usedAppointment: true, usedReportQuery: true, usedOnlinePayment: true, usedMessageCenter: true, daysSinceLastLogin: 1 },
  { userId: "u7", isMonthlyActive: true, usedAppointment: true, usedReportQuery: false, usedOnlinePayment: true, usedMessageCenter: true, daysSinceLastLogin: 4 },
  { userId: "u8", isMonthlyActive: true, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: true, daysSinceLastLogin: 15 },
  { userId: "u9", isMonthlyActive: true, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: true, daysSinceLastLogin: 20 },
  { userId: "u10", isMonthlyActive: true, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 25 },
  { userId: "u11", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 40 },
  { userId: "u12", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 45 },
  { userId: "u13", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 50 },
  { userId: "u14", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 55 },
  { userId: "u15", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 60 },
  { userId: "u16", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 65 },
  { userId: "u17", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 70 },
  { userId: "u18", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 75 },
  { userId: "u19", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 80 },
  { userId: "u20", isMonthlyActive: false, usedAppointment: false, usedReportQuery: false, usedOnlinePayment: false, usedMessageCenter: false, daysSinceLastLogin: 90 },
];

export const patientPortalUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-portal-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-portal-usage:read");
      if (denied) return denied;
      return json(ok({
        monthlyActiveRate: computeMonthlyActiveRateV13(users),
        featureRates: computeFeatureUsageRatesV13(users),
        lowUsagePatients: identifyLowUsagePatientsV13(users),
      }));
    },
  },
];
