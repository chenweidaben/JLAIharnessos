/**
 * 健澜科技 jlmedaios - 数据上报质量管理 V13 单测（M432-B，换名 dataReport + -quality 后缀避让旧版 dataQualityMgmtV13（M409））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDataReportAccuracyRateV13,
  computeDataReportCompletenessRateV13,
  computeDataReportTimelinessRateV13,
  type DataReportQualityMgmtRecordV13,
} from "../../src/bff/aggregators/dataReportQualityMgmtV13Aggregator";
import { dataReportQualityMgmtV13Routes } from "../../src/bff/routes/dataReportQualityMgmtV13";

const records: DataReportQualityMgmtRecordV13[] = [
  { completeItems: 980, shouldReportItems: 1000, accurateRecords: 9500, reportRecords: 10000, timelyReports: 990, shouldReportTimes: 1000 },
  { completeItems: 980, shouldReportItems: 1000, accurateRecords: 9500, reportRecords: 10000, timelyReports: 990, shouldReportTimes: 1000 },
];

describe("computeDataReportCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("数据完整率 = 98.00%", () => {
    expect(computeDataReportCompletenessRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeDataReportCompletenessRateV13([])).toBe(0);
  });
});

describe("computeDataReportAccuracyRateV13", () => {
  // 算式：(9500+9500)/(10000+10000)×100 = 19000/20000×100 = 95.00
  it("数据准确率 = 95.00%", () => {
    expect(computeDataReportAccuracyRateV13(records)).toBe(95.00);
  });
});

describe("computeDataReportTimelinessRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("数据及时率 = 99.00%", () => {
    expect(computeDataReportTimelinessRateV13(records)).toBe(99.00);
  });
});

describe("dataReportQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/data-report-quality-mgmt 路由存在且 auth:true", () => {
    const route = dataReportQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-report-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
