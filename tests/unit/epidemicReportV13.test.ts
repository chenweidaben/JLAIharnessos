/**
 * 健澜科技 jlmedaios - 传染病报告 V13 单测（M370-D，M370 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEpidemicReportAccuracyRateV13,
  computeEpidemicReportOmissionRateV13,
  computeEpidemicReportTimelyRateV13,
  type EpidemicReportRecordV13,
} from "../../src/bff/aggregators/epidemicReportV13Aggregator";
import { epidemicReportV13Routes } from "../../src/bff/routes/epidemicReportV13";

const records: EpidemicReportRecordV13[] = [
  { reportTotal: 100, timelyReport: 95, accurateReport: 98, shouldReport: 102, omittedReport: 2 },
  { reportTotal: 100, timelyReport: 95, accurateReport: 98, shouldReport: 102, omittedReport: 2 },
];

describe("computeEpidemicReportTimelyRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("传染病报告及时率 = 95.00%", () => {
    expect(computeEpidemicReportTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEpidemicReportTimelyRateV13([])).toBe(0);
  });
});

describe("computeEpidemicReportAccuracyRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("报告准确率 = 98.00%", () => {
    expect(computeEpidemicReportAccuracyRateV13(records)).toBe(98.00);
  });
});

describe("computeEpidemicReportOmissionRateV13", () => {
  // 算式：(2+2)/(102+102) = 4/204×100 = 1.96
  it("漏报率 = 1.96%", () => {
    expect(computeEpidemicReportOmissionRateV13(records)).toBe(1.96);
  });
});

describe("epidemicReportV13Routes 读路由", () => {
  it("GET /api/v1/epidemic-report 路由存在且 auth:true", () => {
    const route = epidemicReportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/epidemic-report",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
