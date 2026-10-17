/**
 * 健澜科技 jlmedaios - 资源利用 V13 单测（M364-D，M364 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeLargeEquipmentUtilRateV13,
  computeOrUtilRateV13,
  computeWardUtilRateV13,
  type ResourceUtilRecordV13,
} from "../../src/bff/aggregators/resourceUtilV13Aggregator";
import { resourceUtilV13Routes } from "../../src/bff/routes/resourceUtilV13";

const records: ResourceUtilRecordV13[] = [
  { equipmentActualHours: 800, equipmentRatedHours: 1000, wardOccupiedBedDays: 4800, wardOpenBedDays: 6000, orSurgeryHours: 400, orAvailableHours: 500 },
  { equipmentActualHours: 800, equipmentRatedHours: 1000, wardOccupiedBedDays: 4800, wardOpenBedDays: 6000, orSurgeryHours: 400, orAvailableHours: 500 },
];

describe("computeLargeEquipmentUtilRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("大型设备使用率 = 80.00%", () => {
    expect(computeLargeEquipmentUtilRateV13(records)).toBe(80.00);
  });
  it("空态 → 0", () => {
    expect(computeLargeEquipmentUtilRateV13([])).toBe(0);
  });
});

describe("computeWardUtilRateV13", () => {
  // 算式：(4800+4800)/(6000+6000) = 9600/12000×100 = 80.00
  it("病房使用率 = 80.00%", () => {
    expect(computeWardUtilRateV13(records)).toBe(80.00);
  });
});

describe("computeOrUtilRateV13", () => {
  // 算式：(400+400)/(500+500) = 800/1000×100 = 80.00
  it("手术室使用率 = 80.00%", () => {
    expect(computeOrUtilRateV13(records)).toBe(80.00);
  });
});

describe("resourceUtilV13Routes 读路由", () => {
  it("GET /api/v1/resource-util 路由存在且 auth:true", () => {
    const route = resourceUtilV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/resource-util",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
