/**
 * 健澜科技 jlmedaios - 病房床位使用率 V13 单测（M331-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOverallOccupancyV13,
  computeWardOccupancyV13,
  type WardOccupancyV13,
} from "../../src/bff/aggregators/wardOccupancyV13Aggregator";
import { wardOccupancyV13Routes } from "../../src/bff/routes/wardOccupancyV13";

const wards: WardOccupancyV13[] = [
  { wardName: "心内科", occupiedBedDays: 450, availableBedDays: 500 },
  { wardName: "骨科", occupiedBedDays: 380, availableBedDays: 400 },
  { wardName: "神经内科", occupiedBedDays: 300, availableBedDays: 400 },
];

describe("computeWardOccupancyV13", () => {
  // 算式：心内科450/500=90% / 骨科380/400=95% / 神内300/400=75%
  it("心内科 = 90%", () => {
    const result = computeWardOccupancyV13(wards);
    expect(result.length).toBe(3);
    expect(result[0].wardName).toBe("心内科");
    expect(result[0].occupancyRate).toBe(90);
  });
  it("空态 → []", () => {
    expect(computeWardOccupancyV13([]).length).toBe(0);
  });
});

describe("computeOverallOccupancyV13", () => {
  // 算式：(450+380+300)/(500+400+400) = 1130/1300 ≈ 87%
  it("全院均值 = 87%", () => {
    expect(computeOverallOccupancyV13(wards)).toBe(87);
  });
  it("空态均值 → 0", () => {
    expect(computeOverallOccupancyV13([])).toBe(0);
  });
});

describe("wardOccupancyV13Routes 读路由", () => {
  it("GET /api/v1/ward-occupancy 路由存在且 auth:true", () => {
    const route = wardOccupancyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ward-occupancy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
