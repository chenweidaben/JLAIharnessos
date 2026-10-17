/**
 * 健澜科技 jlmedaios - 人员留存 V13 单测（M384-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeKeyStaffRetentionRateV13,
  computeMedicalStaffTurnoverRateV13,
  computeStaffSatisfactionRateV13,
  type StaffRetentionRecordV13,
} from "../../src/bff/aggregators/staffRetentionV13Aggregator";
import { staffRetentionV13Routes } from "../../src/bff/routes/staffRetentionV13";

const records: StaffRetentionRecordV13[] = [
  { turnoverCount: 50, totalStaff: 1000, retainedKeyStaff: 190, keyStaff: 200, satisfactionCount: 850, surveyCount: 1000 },
  { turnoverCount: 50, totalStaff: 1000, retainedKeyStaff: 190, keyStaff: 200, satisfactionCount: 850, surveyCount: 1000 },
];

describe("computeMedicalStaffTurnoverRateV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000×100 = 5.00
  it("医护离职率 = 5.00%", () => {
    expect(computeMedicalStaffTurnoverRateV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalStaffTurnoverRateV13([])).toBe(0);
  });
});

describe("computeKeyStaffRetentionRateV13", () => {
  // 算式：(190+190)/(200+200) = 380/400×100 = 95.00
  it("骨干留存率 = 95.00%", () => {
    expect(computeKeyStaffRetentionRateV13(records)).toBe(95.00);
  });
});

describe("computeStaffSatisfactionRateV13", () => {
  // 算式：(850+850)/(1000+1000) = 1700/2000×100 = 85.00
  it("员工满意度 = 85.00%", () => {
    expect(computeStaffSatisfactionRateV13(records)).toBe(85.00);
  });
});

describe("staffRetentionV13Routes 读路由", () => {
  it("GET /api/v1/staff-retention 路由存在且 auth:true", () => {
    const route = staffRetentionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-retention",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
