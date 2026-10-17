/**
 * 健澜科技 jlmedaios - 预约管理 V13 单测（M390-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAppointmentCancelRateV13,
  computeAppointmentNoShowRateV13,
  computeAppointmentVisitRateV13,
  type AppointmentMgmtRecordV13,
} from "../../src/bff/aggregators/appointmentMgmtV13Aggregator";
import { appointmentMgmtV13Routes } from "../../src/bff/routes/appointmentMgmtV13";

const records: AppointmentMgmtRecordV13[] = [
  { visitCount: 900, cancelCount: 50, noShowCount: 50, appointmentTotalCount: 1000 },
  { visitCount: 900, cancelCount: 50, noShowCount: 50, appointmentTotalCount: 1000 },
];

describe("computeAppointmentVisitRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("预约就诊率 = 90.00%", () => {
    expect(computeAppointmentVisitRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeAppointmentVisitRateV13([])).toBe(0);
  });
});

describe("computeAppointmentCancelRateV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000×100 = 5.00
  it("预约取消率 = 5.00%", () => {
    expect(computeAppointmentCancelRateV13(records)).toBe(5.00);
  });
});

describe("computeAppointmentNoShowRateV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000×100 = 5.00
  it("爽约率 = 5.00%", () => {
    expect(computeAppointmentNoShowRateV13(records)).toBe(5.00);
  });
});

describe("appointmentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/appointment-mgmt 路由存在且 auth:true", () => {
    const route = appointmentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/appointment-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
