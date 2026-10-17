/**
 * 健澜科技 jlmedaios - 床位使用 V13 单测（M345-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgLosV13,
  computeBedOccupancyRateV13,
  computeBedTurnoverV13,
  type BedOccupancyRecordV13,
} from "../../src/bff/aggregators/bedOccupancyV13Aggregator";
import { bedOccupancyV13Routes } from "../../src/bff/routes/bedOccupancyV13";

const records: BedOccupancyRecordV13[] = [
  { occupiedBedDays: 4500, openBedDays: 5000, avgLos: 8, dischargedPatients: 150, avgBeds: 50 },
  { occupiedBedDays: 4500, openBedDays: 5000, avgLos: 12, dischargedPatients: 150, avgBeds: 50 },
];

describe("computeBedOccupancyRateV13", () => {
  // 算式：(4500+4500)/(5000+5000) = 9000/10000×100 = 90.00
  it("床位使用率 = 90.00%", () => {
    expect(computeBedOccupancyRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeBedOccupancyRateV13([])).toBe(0);
  });
});

describe("computeAvgLosV13", () => {
  // 算式：(8+12)/2 = 20/2 = 10.0
  it("平均住院日 = 10.0 天", () => {
    expect(computeAvgLosV13(records)).toBe(10.0);
  });
});

describe("computeBedTurnoverV13", () => {
  // 算式：(150+150)/(50+50) = 300/100 = 3.0
  it("床位周转次数 = 3.0 次", () => {
    expect(computeBedTurnoverV13(records)).toBe(3.0);
  });
});

describe("bedOccupancyV13Routes 读路由", () => {
  it("GET /api/v1/bed-occupancy 路由存在且 auth:true", () => {
    const route = bedOccupancyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/bed-occupancy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
