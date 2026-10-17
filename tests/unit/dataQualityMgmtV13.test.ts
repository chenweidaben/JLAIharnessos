/**
 * 健澜科技 jlmedaios - 数据质量管理 V13 单测（M409-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataAccuracyRateV13,
  computeDataCompletenessRateV13,
  computeDataTimelinessRateV13,
  type DataQualityMgmtRecordV13,
} from "../../src/bff/aggregators/dataQualityMgmtV13Aggregator";
import { dataQualityMgmtV13Routes } from "../../src/bff/routes/dataQualityMgmtV13";

const records: DataQualityMgmtRecordV13[] = [
  { complete: 980, should: 1000, accurate: 990, total: 1000, timely: 970, shouldReport: 1000 },
  { complete: 980, should: 1000, accurate: 990, total: 1000, timely: 970, shouldReport: 1000 },
];

describe("computeDataCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("数据完整率 = 98.00%", () => {
    expect(computeDataCompletenessRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeDataCompletenessRateV13([])).toBe(0);
  });
});

describe("computeDataAccuracyRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("数据准确率 = 99.00%", () => {
    expect(computeDataAccuracyRateV13(records)).toBe(99.00);
  });
});

describe("computeDataTimelinessRateV13", () => {
  // 算式：(970+970)/(1000+1000)×100 = 1940/2000×100 = 97.00
  it("数据及时率 = 97.00%", () => {
    expect(computeDataTimelinessRateV13(records)).toBe(97.00);
  });
});

describe("dataQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/data-quality-mgmt 路由存在且 auth:true", () => {
    const route = dataQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
