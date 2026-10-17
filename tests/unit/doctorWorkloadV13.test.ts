/**
 * 健澜科技 jlmedaios - 医生工作量 V13 单测（M330-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgInpatientDaysV13,
  computeAvgOutpatientV13,
  computeTotalSurgeriesV13,
  type DoctorWorkloadV13,
} from "../../src/bff/aggregators/doctorWorkloadV13Aggregator";
import { doctorWorkloadV13Routes } from "../../src/bff/routes/doctorWorkloadV13";

const doctors: DoctorWorkloadV13[] = [
  { doctorName: "张医生", outpatientCount: 100, inpatientDays: 50, surgeryCount: 10 },
  { doctorName: "李医生", outpatientCount: 120, inpatientDays: 60, surgeryCount: 15 },
  { doctorName: "王医生", outpatientCount: 80, inpatientDays: 40, surgeryCount: 5 },
];

describe("computeAvgOutpatientV13", () => {
  // 算式：(100+120+80)/3 = 100
  it("人均门诊 = 100", () => {
    expect(computeAvgOutpatientV13(doctors)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeAvgOutpatientV13([])).toBe(0);
  });
});

describe("computeAvgInpatientDaysV13", () => {
  // 算式：(50+60+40)/3 = 50
  it("人均床日 = 50", () => {
    expect(computeAvgInpatientDaysV13(doctors)).toBe(50);
  });
});

describe("computeTotalSurgeriesV13", () => {
  // 算式：10+15+5 = 30
  it("手术总量 = 30", () => {
    expect(computeTotalSurgeriesV13(doctors)).toBe(30);
  });
});

describe("doctorWorkloadV13Routes 读路由", () => {
  it("GET /api/v1/doctor-workload 路由存在且 auth:true", () => {
    const route = doctorWorkloadV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/doctor-workload",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
