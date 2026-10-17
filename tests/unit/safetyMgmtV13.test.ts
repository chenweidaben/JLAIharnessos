/**
 * 健澜科技 jlmedaios - 安全管理 V13 单测（M362-D，M362 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFireDrillCountV13,
  computeHazardRectificationRateV13,
  computeSafetyAccidentCountV13,
  type SafetyMgmtRecordV13,
} from "../../src/bff/aggregators/safetyMgmtV13Aggregator";
import { safetyMgmtV13Routes } from "../../src/bff/routes/safetyMgmtV13";

const records: SafetyMgmtRecordV13[] = [
  { accidentCount: 1, fireDrillCount: 2, hazardRectified: 480, hazardInspected: 500 },
  { accidentCount: 1, fireDrillCount: 2, hazardRectified: 470, hazardInspected: 500 },
];

describe("computeSafetyAccidentCountV13", () => {
  // 算式：1+1 = 2
  it("安全生产事故起数 = 2", () => {
    expect(computeSafetyAccidentCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeSafetyAccidentCountV13([])).toBe(0);
  });
});

describe("computeFireDrillCountV13", () => {
  // 算式：2+2 = 4
  it("消防演练次数 = 4", () => {
    expect(computeFireDrillCountV13(records)).toBe(4);
  });
});

describe("computeHazardRectificationRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("隐患整改率 = 95.00%", () => {
    expect(computeHazardRectificationRateV13(records)).toBe(95.00);
  });
});

describe("safetyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/safety-mgmt 路由存在且 auth:true", () => {
    const route = safetyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/safety-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
