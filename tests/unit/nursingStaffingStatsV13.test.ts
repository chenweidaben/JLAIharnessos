/**
 * 健澜科技 jlmedaios - 护理人力统计 V13 单测（M389-D，stats 避让，M389 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedNurseRatioV13,
  computeNightShiftNurseRatioV13,
  computePatientNurseRatioV13,
  type NursingStaffingRecordV13,
} from "../../src/bff/aggregators/nursingStaffingStatsV13Aggregator";
import { nursingStaffingStatsV13Routes } from "../../src/bff/routes/nursingStaffingStatsV13";

const records: NursingStaffingRecordV13[] = [
  { bedCount: 100, nurseCount: 250, patientCount: 200, shiftNurseCount: 20, nightNurseCount: 10, dayNurseCount: 20 },
  { bedCount: 100, nurseCount: 250, patientCount: 200, shiftNurseCount: 20, nightNurseCount: 10, dayNurseCount: 20 },
];

describe("computeBedNurseRatioV13", () => {
  // 算式：(100+100)/(250+250) = 200/500 = 0.40（1:0.40）
  it("床护比 = 0.40（1:0.40）", () => {
    expect(computeBedNurseRatioV13(records)).toBe(0.40);
  });
  it("空态 → 0", () => {
    expect(computeBedNurseRatioV13([])).toBe(0);
  });
});

describe("computePatientNurseRatioV13", () => {
  // 算式：(200+200)/(20+20) = 400/40 = 10.00（1:10.00）
  it("护患比 = 10.00（1:10.00）", () => {
    expect(computePatientNurseRatioV13(records)).toBe(10.00);
  });
});

describe("computeNightShiftNurseRatioV13", () => {
  // 算式：(10+10)/(20+20) = 20/40 = 0.50
  it("夜班护士配比 = 0.50", () => {
    expect(computeNightShiftNurseRatioV13(records)).toBe(0.50);
  });
});

describe("nursingStaffingStatsV13Routes 读路由", () => {
  it("GET /api/v1/nursing-staffing-stats 路由存在且 auth:true", () => {
    const route = nursingStaffingStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-staffing-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
