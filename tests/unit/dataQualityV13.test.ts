/**
 * 健澜科技 jlmedaios - 数据质量 V13 单测（M344-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAccuracyRateV13,
  computeCompletenessRateV13,
  computeConsistencyRateV13,
  computeTimelinessRateV13,
  type DataQualityRecordV13,
} from "../../src/bff/aggregators/dataQualityV13Aggregator";
import { dataQualityV13Routes } from "../../src/bff/routes/dataQualityV13";

const records: DataQualityRecordV13[] = [
  {
    completedFields: 95,
    requiredFields: 100,
    accurateCount: 98,
    sampledCount: 100,
    consistentCount: 97,
    consistentSampledCount: 100,
    timelyCount: 99,
    totalCount: 100,
  },
  {
    completedFields: 95,
    requiredFields: 100,
    accurateCount: 98,
    sampledCount: 100,
    consistentCount: 97,
    consistentSampledCount: 100,
    timelyCount: 99,
    totalCount: 100,
  },
];

describe("computeCompletenessRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.0
  it("完整率 = 95.0%", () => {
    expect(computeCompletenessRateV13(records)).toBe(95.0);
  });
});

describe("computeAccuracyRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.0
  it("准确率 = 98.0%", () => {
    expect(computeAccuracyRateV13(records)).toBe(98.0);
  });
});

describe("computeConsistencyRateV13", () => {
  // 算式：(97+97)/(100+100) = 194/200×100 = 97.0
  it("一致率 = 97.0%", () => {
    expect(computeConsistencyRateV13(records)).toBe(97.0);
  });
});

describe("computeTimelinessRateV13", () => {
  // 算式：(99+99)/(100+100) = 198/200×100 = 99.0
  it("及时率 = 99.0%", () => {
    expect(computeTimelinessRateV13(records)).toBe(99.0);
  });
});

describe("dataQualityV13Routes 读路由", () => {
  it("GET /api/v1/data-quality 路由存在且 auth:true", () => {
    const route = dataQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
