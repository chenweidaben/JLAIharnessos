/**
 * 健澜科技 jlmedaios - 安全生产 V13 单测（M385-D，M385 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAccidentCountV13,
  computeHazardRectificationRateV13,
  computeSafetyInspectionCountV13,
  type SafetyProductionRecordV13,
} from "../../src/bff/aggregators/safetyProductionV13Aggregator";
import { safetyProductionV13Routes } from "../../src/bff/routes/safetyProductionV13";

const records: SafetyProductionRecordV13[] = [
  { inspectionCount: 20, rectifiedCount: 190, totalHazardCount: 200, accidentCount: 2 },
  { inspectionCount: 20, rectifiedCount: 190, totalHazardCount: 200, accidentCount: 2 },
];

describe("computeSafetyInspectionCountV13", () => {
  // 算式：20+20 = 40
  it("安全检查次数 = 40 次", () => {
    expect(computeSafetyInspectionCountV13(records)).toBe(40);
  });
  it("空态 → 0", () => {
    expect(computeSafetyInspectionCountV13([])).toBe(0);
  });
});

describe("computeHazardRectificationRateV13", () => {
  // 算式：(190+190)/(200+200) = 380/400×100 = 95.00
  it("隐患整改率 = 95.00%", () => {
    expect(computeHazardRectificationRateV13(records)).toBe(95.00);
  });
});

describe("computeAccidentCountV13", () => {
  // 算式：2+2 = 4
  it("事故发生数 = 4 起", () => {
    expect(computeAccidentCountV13(records)).toBe(4);
  });
});

describe("safetyProductionV13Routes 读路由", () => {
  it("GET /api/v1/safety-production 路由存在且 auth:true", () => {
    const route = safetyProductionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/safety-production",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
