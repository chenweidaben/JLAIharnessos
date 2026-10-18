/**
 * 健澜科技 jlmedaios - 护理人力配置管理 V13 单测（M453-B，护理管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingStaffingBedRatioComplianceRateV13,
  computeNursingStaffingQualificationRateV13,
  computeNursingStaffingSchedulingComplianceRateV13,
  type NursingStaffingMgmtRecordV13,
} from "../../src/bff/aggregators/nursingStaffingMgmtV13Aggregator";
import { nursingStaffingMgmtV13Routes } from "../../src/bff/routes/nursingStaffingMgmtV13";

const records: NursingStaffingMgmtRecordV13[] = [
  { compliantDept: 950, totalDept: 1000, qualifiedNurse: 900, totalNurse: 1000, compliantSchedule: 980, totalSchedule: 1000 },
  { compliantDept: 950, totalDept: 1000, qualifiedNurse: 900, totalNurse: 1000, compliantSchedule: 980, totalSchedule: 1000 },
];

describe("computeNursingStaffingBedRatioComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("床护比达标率 = 95.00%", () => {
    expect(computeNursingStaffingBedRatioComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingStaffingBedRatioComplianceRateV13([])).toBe(0);
  });
});

describe("computeNursingStaffingQualificationRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("护理人员资质合格率 = 90.00%", () => {
    expect(computeNursingStaffingQualificationRateV13(records)).toBe(90.00);
  });
});

describe("computeNursingStaffingSchedulingComplianceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("护理排班合规率 = 98.00%", () => {
    expect(computeNursingStaffingSchedulingComplianceRateV13(records)).toBe(98.00);
  });
});

describe("nursingStaffingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/nursing-staffing-mgmt 路由存在且 auth:true", () => {
    const route = nursingStaffingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-staffing-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
