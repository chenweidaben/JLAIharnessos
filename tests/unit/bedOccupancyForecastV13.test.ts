/**
 * 健澜科技 jlmedaios - 床位占用预测 V13 单测（M312-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessBedTensionV13,
  forecastBedOccupancyV13,
  identifyBedCrisisV13,
  type DeptBedV13,
} from "../../src/bff/aggregators/bedOccupancyForecastV13Aggregator";
import { bedOccupancyForecastV13Routes } from "../../src/bff/routes/bedOccupancyForecastV13";

const departments: DeptBedV13[] = [
  { deptId: "cardio", deptName: "心内科", currentOccupancy: 95 },
  { deptId: "surgery", deptName: "外科", currentOccupancy: 70 },
];

describe("forecastBedOccupancyV13", () => {
  // 算式：days=7 → 每个病区 occupancySeries 长度 = 7
  it("days=7 → 序列长度 7", () => {
    const f = forecastBedOccupancyV13(departments, 7);
    expect(f[0].occupancySeries.length).toBe(7);
    expect(f[1].occupancySeries.length).toBe(7);
  });
  it("空态 → []", () => {
    expect(forecastBedOccupancyV13([], 7).length).toBe(0);
  });
});

describe("assessBedTensionV13", () => {
  // 算式：95 ≥ 90 → 红灯
  it("95% → 红灯", () => {
    expect(assessBedTensionV13(95)).toBe("红灯");
  });
  // 算式：85 在 75-90 → 黄灯
  it("85% → 黄灯", () => {
    expect(assessBedTensionV13(85)).toBe("黄灯");
  });
  // 算式：70 < 75 → 绿灯
  it("70% → 绿灯", () => {
    expect(assessBedTensionV13(70)).toBe("绿灯");
  });
});

describe("identifyBedCrisisV13", () => {
  // 算式：2 病区中心内科 95% 红灯 → crisis = [cardio]
  it("红灯 1 个 = cardio", () => {
    const f = forecastBedOccupancyV13(departments, 7);
    expect(identifyBedCrisisV13(f).map((c) => c.deptId)).toEqual(["cardio"]);
  });
});

describe("bedOccupancyForecastV13Routes 读路由", () => {
  it("GET /api/v1/bed-occupancy-forecast 路由存在且 auth:true", () => {
    const route = bedOccupancyForecastV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/bed-occupancy-forecast",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
