/**
 * 健澜科技 jlmedaios - 护理人力配置 V13 单测（M358-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedNurseRatioV13,
  computeIcuNursePatientRatioV13,
  computeWardNursePatientRatioV13,
  type NursingStaffingRecordV13,
} from "../../src/bff/aggregators/nursingStaffingV13Aggregator";
import { nursingStaffingV13Routes } from "../../src/bff/routes/nursingStaffingV13";

const records: NursingStaffingRecordV13[] = [
  { beds: 100, nurses: 200, wardNurses: 150, wardBeds: 100, icuNurses: 50, icuBeds: 20 },
  { beds: 100, nurses: 200, wardNurses: 150, wardBeds: 100, icuNurses: 50, icuBeds: 20 },
];

describe("computeBedNurseRatioV13", () => {
  // 算式：(100+100)/(200+200) = 200/400 = 0.500
  it("床护比 = 0.500", () => {
    expect(computeBedNurseRatioV13(records)).toBe(0.500);
  });
  it("空态 → 0", () => {
    expect(computeBedNurseRatioV13([])).toBe(0);
  });
});

describe("computeWardNursePatientRatioV13", () => {
  // 算式：(150+150)/(100+100) = 300/200 = 1.500
  it("普通病房护患比 = 1.500", () => {
    expect(computeWardNursePatientRatioV13(records)).toBe(1.500);
  });
});

describe("computeIcuNursePatientRatioV13", () => {
  // 算式：(50+50)/(20+20) = 100/40 = 2.500
  it("ICU 护患比 = 2.500", () => {
    expect(computeIcuNursePatientRatioV13(records)).toBe(2.500);
  });
});

describe("nursingStaffingV13Routes 读路由", () => {
  it("GET /api/v1/nursing-staffing 路由存在且 auth:true", () => {
    const route = nursingStaffingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-staffing",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
