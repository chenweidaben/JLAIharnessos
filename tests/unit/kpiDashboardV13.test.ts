/**
 * 健澜科技 jlmedaios - KPI 总览看板 V13 单测（M354-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgLOSV13,
  computeDischargedPatientsV13,
  computeOutpatientEmergencyVisitsV13,
  computeSurgeryCountV13,
  type KpiDashboardRecordV13,
} from "../../src/bff/aggregators/kpiDashboardV13Aggregator";
import { kpiDashboardV13Routes } from "../../src/bff/routes/kpiDashboardV13";

const records: KpiDashboardRecordV13[] = [
  { outpatientEmergencyVisits: 5000, dischargedPatients: 1000, surgeryCount: 200, avgLOS: 8 },
  { outpatientEmergencyVisits: 5000, dischargedPatients: 1000, surgeryCount: 200, avgLOS: 10 },
];

describe("computeOutpatientEmergencyVisitsV13", () => {
  // 算式：5000+5000 = 10000
  it("门急诊人次 = 10000", () => {
    expect(computeOutpatientEmergencyVisitsV13(records)).toBe(10000);
  });
});

describe("computeDischargedPatientsV13", () => {
  // 算式：1000+1000 = 2000
  it("出院人次 = 2000", () => {
    expect(computeDischargedPatientsV13(records)).toBe(2000);
  });
});

describe("computeSurgeryCountV13", () => {
  // 算式：200+200 = 400
  it("手术人次 = 400", () => {
    expect(computeSurgeryCountV13(records)).toBe(400);
  });
});

describe("computeAvgLOSV13", () => {
  // 算式：(8+10)/2 = 9.0
  it("平均住院日 = 9.0 天", () => {
    expect(computeAvgLOSV13(records)).toBe(9.0);
  });
  it("空态 → 0", () => {
    expect(computeAvgLOSV13([])).toBe(0);
  });
});

describe("kpiDashboardV13Routes 读路由", () => {
  it("GET /api/v1/kpi-dashboard 路由存在且 auth:true", () => {
    const route = kpiDashboardV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/kpi-dashboard",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
