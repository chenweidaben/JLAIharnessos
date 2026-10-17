/**
 * 健澜科技 jlmedaios - 分级护理 V13 单测（M404-D，M404 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFirstGradeNursingPassRateV13,
  computeNursingRoundsArrivalRateV13,
  computeSpecialGradeNursingPassRateV13,
  type GradeNursingRecordV13,
} from "../../src/bff/aggregators/gradeNursingV13Aggregator";
import { gradeNursingV13Routes } from "../../src/bff/routes/gradeNursingV13";

const records: GradeNursingRecordV13[] = [
  { specialPass: 980, specialTotal: 1000, firstPass: 950, firstTotal: 1000, roundsArrived: 990, roundsTotal: 1000 },
  { specialPass: 980, specialTotal: 1000, firstPass: 950, firstTotal: 1000, roundsArrived: 990, roundsTotal: 1000 },
];

describe("computeSpecialGradeNursingPassRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("特级护理合格率 = 98.00%", () => {
    expect(computeSpecialGradeNursingPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSpecialGradeNursingPassRateV13([])).toBe(0);
  });
});

describe("computeFirstGradeNursingPassRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("一级护理合格率 = 95.00%", () => {
    expect(computeFirstGradeNursingPassRateV13(records)).toBe(95.00);
  });
});

describe("computeNursingRoundsArrivalRateV13", () => {
  // 算式：(990+990)/(1000+1000) = 1980/2000×100 = 99.00
  it("护理巡视到位率 = 99.00%", () => {
    expect(computeNursingRoundsArrivalRateV13(records)).toBe(99.00);
  });
});

describe("gradeNursingV13Routes 读路由", () => {
  it("GET /api/v1/grade-nursing 路由存在且 auth:true", () => {
    const route = gradeNursingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/grade-nursing",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
