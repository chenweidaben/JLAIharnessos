/**
 * 健澜科技 jlmedaios - 人员管理 V13 单测（M362-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedWorkerRatioV13,
  computeDoctorNurseRatioV13,
  computeHealthTechRatioV13,
  type StaffMgmtRecordV13,
} from "../../src/bff/aggregators/staffMgmtV13Aggregator";
import { staffMgmtV13Routes } from "../../src/bff/routes/staffMgmtV13";

const records: StaffMgmtRecordV13[] = [
  { healthTech: 700, totalStaff: 1000, nurseCount: 600, doctorCount: 300, workerCount: 50, bedCount: 1000 },
  { healthTech: 700, totalStaff: 1000, nurseCount: 600, doctorCount: 300, workerCount: 50, bedCount: 1000 },
];

describe("computeHealthTechRatioV13", () => {
  // 算式：(700+700)/(1000+1000) = 1400/2000×100 = 70.00
  it("卫生技术人员占比 = 70.00%", () => {
    expect(computeHealthTechRatioV13(records)).toBe(70.00);
  });
  it("空态 → 0", () => {
    expect(computeHealthTechRatioV13([])).toBe(0);
  });
});

describe("computeDoctorNurseRatioV13", () => {
  // 算式：(600+600)/(300+300) = 1200/600 = 2.000
  it("医护比 = 2.000", () => {
    expect(computeDoctorNurseRatioV13(records)).toBe(2.000);
  });
});

describe("computeBedWorkerRatioV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000 = 0.050
  it("床工比 = 0.050", () => {
    expect(computeBedWorkerRatioV13(records)).toBe(0.050);
  });
});

describe("staffMgmtV13Routes 读路由", () => {
  it("GET /api/v1/staff-mgmt 路由存在且 auth:true", () => {
    const route = staffMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
