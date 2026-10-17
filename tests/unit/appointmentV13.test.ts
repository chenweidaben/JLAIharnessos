/**
 * 健澜科技 jlmedaios - 预约诊疗 V13 单测（M337-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAppointmentRateV13,
  computeFulfillmentRateV13,
  computeNoShowRateV13,
  type AppointmentRecordV13,
} from "../../src/bff/aggregators/appointmentV13Aggregator";
import { appointmentV13Routes } from "../../src/bff/routes/appointmentV13";

const records: AppointmentRecordV13[] = [
  { totalSlots: 1000, appointmentCount: 800, visitedCount: 720, noShowCount: 80 },
];

describe("computeAppointmentRateV13", () => {
  // 算式：800/1000×100 = 80
  it("预约率 = 80%", () => {
    expect(computeAppointmentRateV13(records)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeAppointmentRateV13([])).toBe(0);
  });
});

describe("computeFulfillmentRateV13", () => {
  // 算式：720/800×100 = 90
  it("履约率 = 90%", () => {
    expect(computeFulfillmentRateV13(records)).toBe(90);
  });
});

describe("computeNoShowRateV13", () => {
  // 算式：80/800×100 = 10
  it("爽约率 = 10%", () => {
    expect(computeNoShowRateV13(records)).toBe(10);
  });
});

describe("appointmentV13Routes 读路由", () => {
  it("GET /api/v1/appointment 路由存在且 auth:true", () => {
    const route = appointmentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/appointment",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
