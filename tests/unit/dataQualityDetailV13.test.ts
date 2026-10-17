/**
 * 健澜科技 jlmedaios - 数据质量明细 V13 单测（M379-D，detail 避让，M379 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataAccuracyRateV13,
  computeDataCompletenessRateV13,
  computeDataConsistencyRateV13,
  type DataQualityRecordV13,
} from "../../src/bff/aggregators/dataQualityDetailV13Aggregator";
import { dataQualityDetailV13Routes } from "../../src/bff/routes/dataQualityDetailV13";

const records: DataQualityRecordV13[] = [
  { totalFields: 1000, completeFields: 950, totalRecords: 1000, accurateRecords: 980, consistentRecords: 970 },
  { totalFields: 1000, completeFields: 950, totalRecords: 1000, accurateRecords: 980, consistentRecords: 970 },
];

describe("computeDataCompletenessRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("数据完整率 = 95.00%", () => {
    expect(computeDataCompletenessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDataCompletenessRateV13([])).toBe(0);
  });
});

describe("computeDataAccuracyRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("数据准确率 = 98.00%", () => {
    expect(computeDataAccuracyRateV13(records)).toBe(98.00);
  });
});

describe("computeDataConsistencyRateV13", () => {
  // 算式：(970+970)/(1000+1000) = 1940/2000×100 = 97.00
  it("数据一致率 = 97.00%", () => {
    expect(computeDataConsistencyRateV13(records)).toBe(97.00);
  });
});

describe("dataQualityDetailV13Routes 读路由", () => {
  it("GET /api/v1/data-quality-detail 路由存在且 auth:true", () => {
    const route = dataQualityDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-quality-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
