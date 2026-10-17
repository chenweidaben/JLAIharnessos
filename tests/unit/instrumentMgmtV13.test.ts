/**
 * 健澜科技 jlmedaios - 器械管理 V13 单测（M391-D，M391 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInstrumentTraceabilityRateV13,
  computeSterilizationQualificationRateV13,
  computeSurgeryInstrumentPackQualificationRateV13,
  type InstrumentMgmtRecordV13,
} from "../../src/bff/aggregators/instrumentMgmtV13Aggregator";
import { instrumentMgmtV13Routes } from "../../src/bff/routes/instrumentMgmtV13";

const records: InstrumentMgmtRecordV13[] = [
  { qualifiedPackCount: 990, totalPackCount: 1000, qualifiedSterilizeCount: 980, totalSterilizeCount: 1000, traceableCount: 950, totalInstrumentCount: 1000 },
  { qualifiedPackCount: 990, totalPackCount: 1000, qualifiedSterilizeCount: 980, totalSterilizeCount: 1000, traceableCount: 950, totalInstrumentCount: 1000 },
];

describe("computeSurgeryInstrumentPackQualificationRateV13", () => {
  // 算式：(990+990)/(1000+1000) = 1980/2000×100 = 99.00
  it("手术器械包合格率 = 99.00%", () => {
    expect(computeSurgeryInstrumentPackQualificationRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeSurgeryInstrumentPackQualificationRateV13([])).toBe(0);
  });
});

describe("computeSterilizationQualificationRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("灭菌合格率 = 98.00%", () => {
    expect(computeSterilizationQualificationRateV13(records)).toBe(98.00);
  });
});

describe("computeInstrumentTraceabilityRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("器械追溯率 = 95.00%", () => {
    expect(computeInstrumentTraceabilityRateV13(records)).toBe(95.00);
  });
});

describe("instrumentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/instrument-mgmt 路由存在且 auth:true", () => {
    const route = instrumentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/instrument-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
