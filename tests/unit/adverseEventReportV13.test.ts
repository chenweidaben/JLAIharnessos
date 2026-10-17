/**
 * 健澜科技 jlmedaios - 不良事件上报 V13 单测（M387-D，M387 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdverseEventReportCountV13,
  computeReportTimelinessRateV13,
  computeRootCauseAnalysisCompletionRateV13,
  type AdverseEventReportRecordV13,
} from "../../src/bff/aggregators/adverseEventReportV13Aggregator";
import { adverseEventReportV13Routes } from "../../src/bff/routes/adverseEventReportV13";

const records: AdverseEventReportRecordV13[] = [
  { reportCount: 20, timelyCount: 38, totalCount: 40, completedRcaCount: 36, shouldRcaCount: 40 },
  { reportCount: 20, timelyCount: 38, totalCount: 40, completedRcaCount: 36, shouldRcaCount: 40 },
];

describe("computeAdverseEventReportCountV13", () => {
  // 算式：20+20 = 40
  it("不良事件上报数 = 40 起", () => {
    expect(computeAdverseEventReportCountV13(records)).toBe(40);
  });
  it("空态 → 0", () => {
    expect(computeAdverseEventReportCountV13([])).toBe(0);
  });
});

describe("computeReportTimelinessRateV13", () => {
  // 算式：(38+38)/(40+40) = 76/80×100 = 95.00
  it("上报及时率 = 95.00%", () => {
    expect(computeReportTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("computeRootCauseAnalysisCompletionRateV13", () => {
  // 算式：(36+36)/(40+40) = 72/80×100 = 90.00
  it("根本原因分析完成率 = 90.00%", () => {
    expect(computeRootCauseAnalysisCompletionRateV13(records)).toBe(90.00);
  });
});

describe("adverseEventReportV13Routes 读路由", () => {
  it("GET /api/v1/adverse-event-report 路由存在且 auth:true", () => {
    const route = adverseEventReportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/adverse-event-report",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
