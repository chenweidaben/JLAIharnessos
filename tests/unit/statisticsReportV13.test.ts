/**
 * 健澜科技 jlmedaios - 统计报表 V13 单测（M401-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeStatisticalAnalysisReportCountV13,
  computeStatisticalDataAccuracyRateV13,
  computeStatutoryReportTimelyRateV13,
  type StatisticsReportRecordV13,
} from "../../src/bff/aggregators/statisticsReportV13Aggregator";
import { statisticsReportV13Routes } from "../../src/bff/routes/statisticsReportV13";

const records: StatisticsReportRecordV13[] = [
  { timelyReported: 950, totalReported: 1000, accurate: 980, totalChecked: 1000, reportCount: 5 },
  { timelyReported: 950, totalReported: 1000, accurate: 980, totalChecked: 1000, reportCount: 5 },
];

describe("computeStatutoryReportTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("法定报表上报及时率 = 95.00%", () => {
    expect(computeStatutoryReportTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeStatutoryReportTimelyRateV13([])).toBe(0);
  });
});

describe("computeStatisticalDataAccuracyRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("统计数据准确率 = 98.00%", () => {
    expect(computeStatisticalDataAccuracyRateV13(records)).toBe(98.00);
  });
});

describe("computeStatisticalAnalysisReportCountV13", () => {
  // 算式：5+5 = 10
  it("统计分析报告数 = 10 份", () => {
    expect(computeStatisticalAnalysisReportCountV13(records)).toBe(10);
  });
});

describe("statisticsReportV13Routes 读路由", () => {
  it("GET /api/v1/statistics-report 路由存在且 auth:true", () => {
    const route = statisticsReportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/statistics-report",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
