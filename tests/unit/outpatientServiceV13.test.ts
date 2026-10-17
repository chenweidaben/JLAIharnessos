/**
 * 健澜科技 jlmedaios - 门诊服务 V13 单测（M372-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientAppointmentRateV13,
  computeOutpatientAverageWaitTimeV13,
  computeOutpatientCountV13,
  type OutpatientServiceRecordV13,
} from "../../src/bff/aggregators/outpatientServiceV13Aggregator";
import { outpatientServiceV13Routes } from "../../src/bff/routes/outpatientServiceV13";

const records: OutpatientServiceRecordV13[] = [
  { outpatientCount: 1000, averageWaitTime: 15, appointmentCount: 800 },
  { outpatientCount: 1000, averageWaitTime: 15, appointmentCount: 800 },
];

describe("computeOutpatientCountV13", () => {
  // 算式：1000+1000 = 2000
  it("门诊人次 = 2000", () => {
    expect(computeOutpatientCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientCountV13([])).toBe(0);
  });
});

describe("computeOutpatientAverageWaitTimeV13", () => {
  // 算式：(15+15)/2 = 15.00
  it("门诊平均候诊时间 = 15.00 分钟", () => {
    expect(computeOutpatientAverageWaitTimeV13(records)).toBe(15.00);
  });
});

describe("computeOutpatientAppointmentRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("门诊预约率 = 80.00%", () => {
    expect(computeOutpatientAppointmentRateV13(records)).toBe(80.00);
  });
});

describe("outpatientServiceV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-service 路由存在且 auth:true", () => {
    const route = outpatientServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
