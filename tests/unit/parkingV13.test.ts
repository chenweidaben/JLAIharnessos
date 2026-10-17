/**
 * 健澜科技 jlmedaios - 停车场使用率 V13 单测（M331-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeParkingTurnoverV13,
  computeParkingUtilizationV13,
  type ParkingLotV13,
} from "../../src/bff/aggregators/parkingV13Aggregator";
import { parkingV13Routes } from "../../src/bff/routes/parkingV13";

const parking: ParkingLotV13[] = [
  { totalSpaces: 200, usedSpaces: 160, parkingCount: 400 },
];

describe("computeParkingUtilizationV13", () => {
  // 算式：160/200×100 = 80
  it("使用率 = 80%", () => {
    expect(computeParkingUtilizationV13(parking)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeParkingUtilizationV13([])).toBe(0);
  });
});

describe("computeParkingTurnoverV13", () => {
  // 算式：400/200 = 2
  it("周转率 = 2", () => {
    expect(computeParkingTurnoverV13(parking)).toBe(2);
  });
  it("空态周转率 → 0", () => {
    expect(computeParkingTurnoverV13([])).toBe(0);
  });
});

describe("parkingV13Routes 读路由", () => {
  it("GET /api/v1/parking 路由存在且 auth:true", () => {
    const route = parkingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/parking",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
