/**
 * 健澜科技 jlmedaios - 单病种质量管理 V13 单测（M452-B，医院评审与临床质量改进组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSingleDiseaseAverageLengthOfStayV13,
  computeSingleDiseaseControlIndicatorComplianceRateV13,
  computeSingleDiseaseReportRateV13,
  type SingleDiseaseQualityMgmtRecordV13,
} from "../../src/bff/aggregators/singleDiseaseQualityMgmtV13Aggregator";
import { singleDiseaseQualityMgmtV13Routes } from "../../src/bff/routes/singleDiseaseQualityMgmtV13";

const records: SingleDiseaseQualityMgmtRecordV13[] = [
  { reported: 950, shouldReport: 1000, qualified: 900, totalIndicator: 1000, lengthOfStay: 7.3 },
  { reported: 950, shouldReport: 1000, qualified: 900, totalIndicator: 1000, lengthOfStay: 7.7 },
];

describe("computeSingleDiseaseReportRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("单病种上报率 = 95.00%", () => {
    expect(computeSingleDiseaseReportRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSingleDiseaseReportRateV13([])).toBe(0);
  });
});

describe("computeSingleDiseaseControlIndicatorComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("单病种质量控制指标达标率 = 90.00%", () => {
    expect(computeSingleDiseaseControlIndicatorComplianceRateV13(records)).toBe(90.00);
  });
});

describe("computeSingleDiseaseAverageLengthOfStayV13", () => {
  // 算式：avg = (7.3+7.7)/2 = 15/2 = 7.5 → Math.ceil(7.5) = 8 天
  it("单病种平均住院日 = 8 天（Math.ceil 整天）", () => {
    expect(computeSingleDiseaseAverageLengthOfStayV13(records)).toBe(8);
  });
});

describe("singleDiseaseQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/single-disease-quality-mgmt 路由存在且 auth:true", () => {
    const route = singleDiseaseQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/single-disease-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
