/**
 * 健澜科技 jlmedaios - 31 天再入院率 V13 单测（M335-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDiseaseReadmissionRateV13,
  computeOverallReadmissionRateV13,
  type ReadmissionRecordV13,
} from "../../src/bff/aggregators/readmissionV13Aggregator";
import { readmissionV13Routes } from "../../src/bff/routes/readmissionV13";

const records: ReadmissionRecordV13[] = [
  { disease: "心衰", dischargedCount: 200, readmittedCount: 20 },
  { disease: "慢阻肺", dischargedCount: 300, readmittedCount: 10 },
  { disease: "脑梗死", dischargedCount: 500, readmittedCount: 0 },
];

describe("computeOverallReadmissionRateV13", () => {
  // 算式：(20+10+0)/(200+300+500) = 30/1000×100 = 3
  it("总体再入院率 = 3%", () => {
    expect(computeOverallReadmissionRateV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(computeOverallReadmissionRateV13([])).toBe(0);
  });
});

describe("computeDiseaseReadmissionRateV13", () => {
  // 算式：心衰 20/200×100 = 10.0
  it("心衰 = 10.0%", () => {
    const rates = computeDiseaseReadmissionRateV13(records);
    expect(rates.length).toBe(3);
    expect(rates[0].disease).toBe("心衰");
    expect(rates[0].rate).toBe(10.0);
  });
  it("慢阻肺 = 3.3%", () => {
    const rates = computeDiseaseReadmissionRateV13(records);
    expect(rates[1].disease).toBe("慢阻肺");
    expect(rates[1].rate).toBe(3.3);
  });
});

describe("readmissionV13Routes 读路由", () => {
  it("GET /api/v1/readmission-stats 路由存在且 auth:true", () => {
    const route = readmissionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/readmission-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
