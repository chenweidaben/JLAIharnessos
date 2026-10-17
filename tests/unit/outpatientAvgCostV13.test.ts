/**
 * 健澜科技 jlmedaios - 门诊次均费用 V13 单测（M317-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeptAvgCostV13,
  computeDoctorAvgCostV13,
  flagHighAvgCostV13,
  type OutpatientVisitV13,
} from "../../src/bff/aggregators/outpatientAvgCostV13Aggregator";
import { outpatientAvgCostV13Routes } from "../../src/bff/routes/outpatientAvgCostV13";

const visits: OutpatientVisitV13[] = [
  { visitId: "v1", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v2", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v3", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v4", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v5", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v6", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v7", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v8", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v9", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v10", dept: "cardio", doctorId: "D02", cost: 700 },
];

describe("computeDeptAvgCostV13", () => {
  // 算式：cardio 10 就诊总费用 = 500×5 + 700×5 = 2500+3500 = 6000
  // deptAvg = 6000/10 = 600
  it("cardio avg = 600", () => {
    expect(computeDeptAvgCostV13(visits, "cardio")).toBe(600);
  });
  it("空态 → 0", () => {
    expect(computeDeptAvgCostV13([], "cardio")).toBe(0);
  });
});

describe("computeDoctorAvgCostV13", () => {
  // 算式：D01 5 就诊总费用 = 500×5 = 2500 → avg = 2500/5 = 500
  it("D01 avg = 500", () => {
    expect(computeDoctorAvgCostV13(visits, "D01")).toBe(500);
  });
  // 算式：D02 5 就诊总费用 = 700×5 = 3500 → avg = 3500/5 = 700
  it("D02 avg = 700", () => {
    expect(computeDoctorAvgCostV13(visits, "D02")).toBe(700);
  });
});

describe("flagHighAvgCostV13", () => {
  // 算式：700 > 600 → 红牌
  it("700 > 600 → 红牌", () => {
    expect(flagHighAvgCostV13(700, 600)).toBe(true);
  });
  // 算式：500 < 600 → 不红牌
  it("500 < 600 → 不红牌", () => {
    expect(flagHighAvgCostV13(500, 600)).toBe(false);
  });
});

describe("outpatientAvgCostV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-avg-cost 路由存在且 auth:true", () => {
    const route = outpatientAvgCostV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-avg-cost",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
