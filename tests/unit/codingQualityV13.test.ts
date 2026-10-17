/**
 * 健澜科技 jlmedaios - 编码质量 V13 单测（M401-D，M401 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCodingDefectRateV13,
  computeICD10AccuracyRateV13,
  computeICD9CM3AccuracyRateV13,
  type CodingQualityRecordV13,
} from "../../src/bff/aggregators/codingQualityV13Aggregator";
import { codingQualityV13Routes } from "../../src/bff/routes/codingQualityV13";

const records: CodingQualityRecordV13[] = [
  { icd10Accurate: 980, icd10Total: 1000, icd9Accurate: 970, icd9Total: 1000, defectCount: 20, totalCoding: 1000 },
  { icd10Accurate: 980, icd10Total: 1000, icd9Accurate: 970, icd9Total: 1000, defectCount: 20, totalCoding: 1000 },
];

describe("computeICD10AccuracyRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("ICD-10 编码准确率 = 98.00%", () => {
    expect(computeICD10AccuracyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeICD10AccuracyRateV13([])).toBe(0);
  });
});

describe("computeICD9CM3AccuracyRateV13", () => {
  // 算式：(970+970)/(1000+1000) = 1940/2000×100 = 97.00
  it("ICD-9-CM-3 编码准确率 = 97.00%", () => {
    expect(computeICD9CM3AccuracyRateV13(records)).toBe(97.00);
  });
});

describe("computeCodingDefectRateV13", () => {
  // 算式：(20+20)/(1000+1000) = 40/2000×100 = 2.00
  it("编码缺陷率 = 2.00%", () => {
    expect(computeCodingDefectRateV13(records)).toBe(2.00);
  });
});

describe("codingQualityV13Routes 读路由", () => {
  it("GET /api/v1/coding-quality 路由存在且 auth:true", () => {
    const route = codingQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/coding-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
