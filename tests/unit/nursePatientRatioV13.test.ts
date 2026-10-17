/**
 * 健澜科技 jlmedaios - 护患比 V13 单测（M346-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedCountV13,
  computeNurseCountV13,
  computeNursePatientRatioV13,
  type NursePatientRatioRecordV13,
} from "../../src/bff/aggregators/nursePatientRatioV13Aggregator";
import { nursePatientRatioV13Routes } from "../../src/bff/routes/nursePatientRatioV13";

const records: NursePatientRatioRecordV13[] = [
  { bedCount: 100, nurseCount: 50 },
  { bedCount: 100, nurseCount: 50 },
];

describe("computeBedCountV13", () => {
  // 算式：100+100 = 200
  it("病区床位数 = 200", () => {
    expect(computeBedCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeBedCountV13([])).toBe(0);
  });
});

describe("computeNurseCountV13", () => {
  // 算式：50+50 = 100
  it("护士数 = 100", () => {
    expect(computeNurseCountV13(records)).toBe(100);
  });
});

describe("computeNursePatientRatioV13", () => {
  // 算式：200/100 = 2.00
  it("护患比 = 2.00", () => {
    expect(computeNursePatientRatioV13(records)).toBe(2.00);
  });
});

describe("nursePatientRatioV13Routes 读路由", () => {
  it("GET /api/v1/nurse-patient-ratio 路由存在且 auth:true", () => {
    const route = nursePatientRatioV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nurse-patient-ratio",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
