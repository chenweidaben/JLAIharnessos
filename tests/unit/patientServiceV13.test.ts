/**
 * 健澜科技 jlmedaios - 患者服务 V13 单测（M400-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFreeBloodPressureCheckCountV13,
  computeOneStopServiceCenterCountV13,
  computeWheelchairRentalCountV13,
  type PatientServiceRecordV13,
} from "../../src/bff/aggregators/patientServiceV13Aggregator";
import { patientServiceV13Routes } from "../../src/bff/routes/patientServiceV13";

const records: PatientServiceRecordV13[] = [
  { oneStopCount: 500, wheelchairCount: 100, bpCheckCount: 300 },
  { oneStopCount: 500, wheelchairCount: 100, bpCheckCount: 300 },
];

describe("computeOneStopServiceCenterCountV13", () => {
  // 算式：500+500 = 1000
  it("一站式服务中心办件数 = 1000 件", () => {
    expect(computeOneStopServiceCenterCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeOneStopServiceCenterCountV13([])).toBe(0);
  });
});

describe("computeWheelchairRentalCountV13", () => {
  // 算式：100+100 = 200
  it("轮椅租借次数 = 200 次", () => {
    expect(computeWheelchairRentalCountV13(records)).toBe(200);
  });
});

describe("computeFreeBloodPressureCheckCountV13", () => {
  // 算式：300+300 = 600
  it("免费测血压次数 = 600 次", () => {
    expect(computeFreeBloodPressureCheckCountV13(records)).toBe(600);
  });
});

describe("patientServiceV13Routes 读路由", () => {
  it("GET /api/v1/patient-service 路由存在且 auth:true", () => {
    const route = patientServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
