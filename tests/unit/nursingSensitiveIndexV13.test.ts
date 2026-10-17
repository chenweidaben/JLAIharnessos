/**
 * 健澜科技 jlmedaios - 护理敏感指标 V13 单测（M376-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFallRateV13,
  computePressureUlcerRateV13,
  computeUnplannedExtubationRateV13,
  type NursingSensitiveIndexRecordV13,
} from "../../src/bff/aggregators/nursingSensitiveIndexV13Aggregator";
import { nursingSensitiveIndexV13Routes } from "../../src/bff/routes/nursingSensitiveIndexV13";

const records: NursingSensitiveIndexRecordV13[] = [
  { inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3, intubationCount: 100, unplannedExtubationCount: 5 },
  { inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3, intubationCount: 100, unplannedExtubationCount: 5 },
];

describe("computePressureUlcerRateV13", () => {
  // 算式：(2+2)/(1000+1000) = 4/2000×100 = 0.20
  it("压疮发生率 = 0.20%", () => {
    expect(computePressureUlcerRateV13(records)).toBe(0.20);
  });
  it("空态 → 0", () => {
    expect(computePressureUlcerRateV13([])).toBe(0);
  });
});

describe("computeFallRateV13", () => {
  // 算式：(3+3)/(1000+1000) = 6/2000×100 = 0.30
  it("跌倒发生率 = 0.30%", () => {
    expect(computeFallRateV13(records)).toBe(0.30);
  });
});

describe("computeUnplannedExtubationRateV13", () => {
  // 算式：(5+5)/(100+100) = 10/200×100 = 5.00
  it("非计划拔管率 = 5.00%", () => {
    expect(computeUnplannedExtubationRateV13(records)).toBe(5.00);
  });
});

describe("nursingSensitiveIndexV13Routes 读路由", () => {
  it("GET /api/v1/nursing-sensitive-index 路由存在且 auth:true", () => {
    const route = nursingSensitiveIndexV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-sensitive-index",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
