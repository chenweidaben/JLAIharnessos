/**
 * 健澜科技 jlmedaios - 预约服务统计 V13 单测（M378-A，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAppointmentCountV13,
  computeAppointmentVisitRateV13,
  computeNoShowRateV13,
  type AppointmentRecordV13,
} from "../../src/bff/aggregators/appointmentStatsV13Aggregator";
import { appointmentStatsV13Routes } from "../../src/bff/routes/appointmentStatsV13";

const records: AppointmentRecordV13[] = [
  { appointmentCount: 1000, visitCount: 950, noShowCount: 50 },
  { appointmentCount: 1000, visitCount: 950, noShowCount: 50 },
];

describe("computeAppointmentCountV13", () => {
  // 算式：1000+1000 = 2000
  it("预约挂号人次 = 2000", () => {
    expect(computeAppointmentCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeAppointmentCountV13([])).toBe(0);
  });
});

describe("computeAppointmentVisitRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("预约就诊率 = 95.00%", () => {
    expect(computeAppointmentVisitRateV13(records)).toBe(95.00);
  });
});

describe("computeNoShowRateV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000×100 = 5.00
  it("爽约率 = 5.00%", () => {
    expect(computeNoShowRateV13(records)).toBe(5.00);
  });
});

describe("appointmentStatsV13Routes 读路由", () => {
  it("GET /api/v1/appointment-stats 路由存在且 auth:true", () => {
    const route = appointmentStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/appointment-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
