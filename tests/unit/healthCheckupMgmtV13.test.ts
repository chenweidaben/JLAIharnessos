/**
 * 健澜科技 jlmedaios - 健康管理体检管理 V13 单测（M459-B，医院运营与健康管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHealthCheckupAbnormalFollowupRateV13,
  computeHealthCheckupAppointmentRateV13,
  computeHealthCheckupReportIssueTimelyRateV13,
  type HealthCheckupMgmtRecordV13,
} from "../../src/bff/aggregators/healthCheckupMgmtV13Aggregator";
import { healthCheckupMgmtV13Routes } from "../../src/bff/routes/healthCheckupMgmtV13";

const records: HealthCheckupMgmtRecordV13[] = [
  { booked: 950, total: 1000, timely: 900, totalReport: 1000, followedUp: 980, totalAbnormal: 1000 },
  { booked: 950, total: 1000, timely: 900, totalReport: 1000, followedUp: 980, totalAbnormal: 1000 },
];

describe("computeHealthCheckupAppointmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("体检预约率 = 95.00%", () => {
    expect(computeHealthCheckupAppointmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHealthCheckupAppointmentRateV13([])).toBe(0);
  });
});

describe("computeHealthCheckupReportIssueTimelyRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("体检报告出具及时率 = 90.00%", () => {
    expect(computeHealthCheckupReportIssueTimelyRateV13(records)).toBe(90.00);
  });
});

describe("computeHealthCheckupAbnormalFollowupRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("体检异常随访率 = 98.00%", () => {
    expect(computeHealthCheckupAbnormalFollowupRateV13(records)).toBe(98.00);
  });
});

describe("healthCheckupMgmtV13Routes 读路由", () => {
  it("GET /api/v1/health-checkup-mgmt 路由存在且 auth:true", () => {
    const route = healthCheckupMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/health-checkup-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
