/**
 * 健澜科技 jlmedaios - 效率指标 V13 单测（M396-D，M396 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAverageLOSReductionRateV13,
  computeBedWorkdayUtilizationRateV13,
  computePreopWaitingTimeAvgV13,
  type EfficiencyIndicatorRecordV13,
} from "../../src/bff/aggregators/efficiencyIndicatorV13Aggregator";
import { efficiencyIndicatorV13Routes } from "../../src/bff/routes/efficiencyIndicatorV13";

const records: EfficiencyIndicatorRecordV13[] = [
  { lastLOS: 10, currentLOS: 9.5, preopWaitDays: 150, surgeryCount: 50, occupiedBedDays: 270, calendarDays: 300 },
  { lastLOS: 10, currentLOS: 9.5, preopWaitDays: 150, surgeryCount: 50, occupiedBedDays: 270, calendarDays: 300 },
];

describe("computeAverageLOSReductionRateV13", () => {
  // 算式：avgLast=(10+10)/2=10, avgCurrent=(9.5+9.5)/2=9.5, (10-9.5)/10×100 = 5.00
  it("平均住院日缩短率 = 5.00%", () => {
    expect(computeAverageLOSReductionRateV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeAverageLOSReductionRateV13([])).toBe(0);
  });
});

describe("computePreopWaitingTimeAvgV13", () => {
  // 算式：(150+150)/(50+50) = 300/100 = 3.00
  it("术前等待时间 = 3.00 天", () => {
    expect(computePreopWaitingTimeAvgV13(records)).toBe(3.00);
  });
});

describe("computeBedWorkdayUtilizationRateV13", () => {
  // 算式：(270+270)/(300+300) = 540/600×100 = 90.00
  it("床位工作日利用率 = 90.00%", () => {
    expect(computeBedWorkdayUtilizationRateV13(records)).toBe(90.00);
  });
});

describe("efficiencyIndicatorV13Routes 读路由", () => {
  it("GET /api/v1/efficiency-indicator 路由存在且 auth:true", () => {
    const route = efficiencyIndicatorV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/efficiency-indicator",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
