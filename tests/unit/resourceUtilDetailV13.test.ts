/**
 * 健澜科技 jlmedaios - 资源利用明细 V13 单测（M381-D，M381 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedUsageRateV13,
  computeLargeEquipmentUsageRateV13,
  computeOperatingRoomUsageRateV13,
  type ResourceUtilDetailRecordV13,
} from "../../src/bff/aggregators/resourceUtilDetailV13Aggregator";
import { resourceUtilDetailV13Routes } from "../../src/bff/routes/resourceUtilDetailV13";

const records: ResourceUtilDetailRecordV13[] = [
  { occupiedBedDays: 950, openBedDays: 1000, surgeryHours: 480, openHours: 600, usageHours: 120, availableHours: 150 },
  { occupiedBedDays: 950, openBedDays: 1000, surgeryHours: 480, openHours: 600, usageHours: 120, availableHours: 150 },
];

describe("computeBedUsageRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("床位使用率 = 95.00%", () => {
    expect(computeBedUsageRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeBedUsageRateV13([])).toBe(0);
  });
});

describe("computeOperatingRoomUsageRateV13", () => {
  // 算式：(480+480)/(600+600) = 960/1200×100 = 80.00
  it("手术室使用率 = 80.00%", () => {
    expect(computeOperatingRoomUsageRateV13(records)).toBe(80.00);
  });
});

describe("computeLargeEquipmentUsageRateV13", () => {
  // 算式：(120+120)/(150+150) = 240/300×100 = 80.00
  it("大型设备使用率 = 80.00%", () => {
    expect(computeLargeEquipmentUsageRateV13(records)).toBe(80.00);
  });
});

describe("resourceUtilDetailV13Routes 读路由", () => {
  it("GET /api/v1/resource-util-detail 路由存在且 auth:true", () => {
    const route = resourceUtilDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/resource-util-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
