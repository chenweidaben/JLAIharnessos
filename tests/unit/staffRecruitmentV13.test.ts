/**
 * 健澜科技 jlmedaios - 人员招聘 V13 单测（M384-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHiredCountV13,
  computeRecruitmentOnboardRateV13,
  computeRecruitmentPositionCountV13,
  type StaffRecruitmentRecordV13,
} from "../../src/bff/aggregators/staffRecruitmentV13Aggregator";
import { staffRecruitmentV13Routes } from "../../src/bff/routes/staffRecruitmentV13";

const records: StaffRecruitmentRecordV13[] = [
  { positionCount: 50, hiredCount: 80, onboardCount: 72 },
  { positionCount: 50, hiredCount: 80, onboardCount: 72 },
];

describe("computeRecruitmentPositionCountV13", () => {
  // 算式：50+50 = 100
  it("招聘岗位数 = 100 个", () => {
    expect(computeRecruitmentPositionCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeRecruitmentPositionCountV13([])).toBe(0);
  });
});

describe("computeHiredCountV13", () => {
  // 算式：80+80 = 160
  it("录用人数 = 160 人", () => {
    expect(computeHiredCountV13(records)).toBe(160);
  });
});

describe("computeRecruitmentOnboardRateV13", () => {
  // 算式：(72+72)/(80+80) = 144/160×100 = 90.00
  it("招聘到岗率 = 90.00%", () => {
    expect(computeRecruitmentOnboardRateV13(records)).toBe(90.00);
  });
});

describe("staffRecruitmentV13Routes 读路由", () => {
  it("GET /api/v1/staff-recruitment 路由存在且 auth:true", () => {
    const route = staffRecruitmentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-recruitment",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
