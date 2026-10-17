/**
 * 健澜科技 jlmedaios - 胸痛中心 V13 单测（M348-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDToBMinutesV13,
  computeDoorToBalloonQualifiedRateV13,
  computeSTEMIRatioV13,
  type ChestPainCenterRecordV13,
} from "../../src/bff/aggregators/chestPainCenterV13Aggregator";
import { chestPainCenterV13Routes } from "../../src/bff/routes/chestPainCenterV13";

const records: ChestPainCenterRecordV13[] = [
  { dtoBMinutes: 90, stemiCount: 20, chestPainTotal: 50, doorToBalloonQualified: 45, dtoBTotal: 50 },
  { dtoBMinutes: 100, stemiCount: 30, chestPainTotal: 50, doorToBalloonQualified: 48, dtoBTotal: 50 },
];

describe("computeDToBMinutesV13", () => {
  // 算式：(90+100)/2 = 95.0
  it("D-to-B 时间 = 95.0 分钟", () => {
    expect(computeDToBMinutesV13(records)).toBe(95.0);
  });
  it("空态 → 0", () => {
    expect(computeDToBMinutesV13([])).toBe(0);
  });
});

describe("computeSTEMIRatioV13", () => {
  // 算式：(20+30)/(50+50) = 50/100×100 = 50.00
  it("STEMI 占比 = 50.00%", () => {
    expect(computeSTEMIRatioV13(records)).toBe(50.00);
  });
});

describe("computeDoorToBalloonQualifiedRateV13", () => {
  // 算式：(45+48)/(50+50) = 93/100×100 = 93.00
  it("门-球时间达标率 = 93.00%", () => {
    expect(computeDoorToBalloonQualifiedRateV13(records)).toBe(93.00);
  });
});

describe("chestPainCenterV13Routes 读路由", () => {
  it("GET /api/v1/chest-pain-center 路由存在且 auth:true", () => {
    const route = chestPainCenterV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/chest-pain-center",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
