/**
 * 健澜科技 jlmedaios - 出生缺陷监测 V13 单测（M442-C，妇幼健康与计划生育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBirthDefectInterventionRateV13,
  computeBirthDefectPrenatalScreeningRateV13,
  computeBirthDefectRateV13,
  type BirthDefectMonitoringRecordV13,
} from "../../src/bff/aggregators/birthDefectMonitoringV13Aggregator";
import { birthDefectMonitoringV13Routes } from "../../src/bff/routes/birthDefectMonitoringV13";

const records: BirthDefectMonitoringRecordV13[] = [
  { birthDefectCount: 20, perinatalTotal: 10000, prenatalScreened: 950, totalMaternal: 1000, intervenedDefect: 850, totalDefect: 1000 },
  { birthDefectCount: 20, perinatalTotal: 10000, prenatalScreened: 950, totalMaternal: 1000, intervenedDefect: 850, totalDefect: 1000 },
];

describe("computeBirthDefectRateV13", () => {
  // 算式：(20+20)/(10000+10000)×10000 = 40/20000×10000 = 20.00/万（万分之率，反向，越低越好）
  it("出生缺陷发生率 = 20.00/万（万分之率，反向，越低越好）", () => {
    expect(computeBirthDefectRateV13(records)).toBe(20.00);
  });
  it("空态 → 0", () => {
    expect(computeBirthDefectRateV13([])).toBe(0);
  });
});

describe("computeBirthDefectPrenatalScreeningRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("产前筛查率 = 95.00%", () => {
    expect(computeBirthDefectPrenatalScreeningRateV13(records)).toBe(95.00);
  });
});

describe("computeBirthDefectInterventionRateV13", () => {
  // 算式：(850+850)/(1000+1000)×100 = 1700/2000×100 = 85.00
  it("缺陷儿干预率 = 85.00%", () => {
    expect(computeBirthDefectInterventionRateV13(records)).toBe(85.00);
  });
});

describe("birthDefectMonitoringV13Routes 读路由", () => {
  it("GET /api/v1/birth-defect-monitoring 路由存在且 auth:true", () => {
    const route = birthDefectMonitoringV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/birth-defect-monitoring",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
