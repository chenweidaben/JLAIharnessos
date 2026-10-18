/**
 * 健澜科技 jlmedaios - 统计管理 V13 单测（M450-D，M450 收官，宣传与党建管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeStatisticsAnalysisReportCompletionRateV13,
  computeStatisticsDataAccuracyRateV13,
  computeStatisticsReportTimelinessRateV13,
  type StatisticsMgmtRecordV13,
} from "../../src/bff/aggregators/statisticsMgmtV13Aggregator";
import { statisticsMgmtV13Routes } from "../../src/bff/routes/statisticsMgmtV13";

const records: StatisticsMgmtRecordV13[] = [
  { timely: 950, shouldReport: 1000, accurate: 900, totalItems: 1000, completed: 980, totalReport: 1000 },
  { timely: 950, shouldReport: 1000, accurate: 900, totalItems: 1000, completed: 980, totalReport: 1000 },
];

describe("computeStatisticsReportTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("统计报表及时率 = 95.00%", () => {
    expect(computeStatisticsReportTimelinessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeStatisticsReportTimelinessRateV13([])).toBe(0);
  });
});

describe("computeStatisticsDataAccuracyRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("统计数据准确率 = 90.00%", () => {
    expect(computeStatisticsDataAccuracyRateV13(records)).toBe(90.00);
  });
});

describe("computeStatisticsAnalysisReportCompletionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("统计分析报告完成率 = 98.00%", () => {
    expect(computeStatisticsAnalysisReportCompletionRateV13(records)).toBe(98.00);
  });
});

describe("statisticsMgmtV13Routes 读路由", () => {
  it("GET /api/v1/statistics-mgmt 路由存在且 auth:true", () => {
    const route = statisticsMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/statistics-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
