/**
 * 健澜科技 jlmedaios - 患者门户使用度 V13 单测（M316-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFeatureUsageRatesV13,
  computeMonthlyActiveRateV13,
  identifyLowUsagePatientsV13,
  type PortalUserV13,
} from "../../src/bff/aggregators/patientPortalUsageV13Aggregator";
import { patientPortalUsageV13Routes } from "../../src/bff/routes/patientPortalUsageV13";

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

describe("computeMonthlyActiveRateV13", () => {
  // 算式：20 用户中本月活跃 = u1-u10 = 10
  // monthlyActiveRate = 10/20×100 = 50
  it("monthlyActiveRate = 50", () => {
    expect(computeMonthlyActiveRateV13(users)).toBe(50);
  });
  it("空态 → 0", () => {
    expect(computeMonthlyActiveRateV13([])).toBe(0);
  });
});

describe("computeFeatureUsageRatesV13", () => {
  // 算式：预约 u1-u7 = 7；报告 u1-u6 = 6；支付 u5-u7 = 3；消息 u1-u9 = 9
  // appointment = 7/20×100 = 35
  // reportQuery = 6/20×100 = 30
  // onlinePayment = 3/20×100 = 15
  // messageCenter = 9/20×100 = 45
  it("appointment=35, reportQuery=30, onlinePayment=15, messageCenter=45", () => {
    const r = computeFeatureUsageRatesV13(users);
    expect(r.appointment).toBe(35);
    expect(r.reportQuery).toBe(30);
    expect(r.onlinePayment).toBe(15);
    expect(r.messageCenter).toBe(45);
  });
});

describe("identifyLowUsagePatientsV13", () => {
  // 算式：daysSinceLastLogin>30 = u11-u20 = 10 人
  it("低使用 = 10 人", () => {
    expect(identifyLowUsagePatientsV13(users).length).toBe(10);
  });
  it("空态 → []", () => {
    expect(identifyLowUsagePatientsV13([]).length).toBe(0);
  });
});

describe("patientPortalUsageV13Routes 读路由", () => {
  it("GET /api/v1/patient-portal-usage 路由存在且 auth:true", () => {
    const route = patientPortalUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-portal-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
