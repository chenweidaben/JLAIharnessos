/**
 * 健澜科技 jlmedaios - 不良事件管理（细节）V13 单测（M413-D，M413 收官，detail 避让旧版 adverseEventReportV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdverseEventReportRateV13,
  computeRectificationMeasureImplementationRateV13,
  computeRootCauseAnalysisCompletionRateV13,
  type AdverseEventDetailRecordV13,
} from "../../src/bff/aggregators/adverseEventDetailV13Aggregator";
import { adverseEventDetailV13Routes } from "../../src/bff/routes/adverseEventDetailV13";

const records: AdverseEventDetailRecordV13[] = [
  { reported: 980, shouldTotal: 1000, rootCauseDone: 95, eventTotal: 100, rectified: 99, shouldRectifyTotal: 100 },
  { reported: 980, shouldTotal: 1000, rootCauseDone: 95, eventTotal: 100, rectified: 99, shouldRectifyTotal: 100 },
];

describe("computeAdverseEventReportRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("不良事件上报率 = 98.00%", () => {
    expect(computeAdverseEventReportRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeAdverseEventReportRateV13([])).toBe(0);
  });
});

describe("computeRootCauseAnalysisCompletionRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("根因分析完成率 = 95.00%", () => {
    expect(computeRootCauseAnalysisCompletionRateV13(records)).toBe(95.00);
  });
});

describe("computeRectificationMeasureImplementationRateV13", () => {
  // 算式：(99+99)/(100+100)×100 = 198/200×100 = 99.00
  it("整改措施落实率 = 99.00%", () => {
    expect(computeRectificationMeasureImplementationRateV13(records)).toBe(99.00);
  });
});

describe("adverseEventDetailV13Routes 读路由", () => {
  it("GET /api/v1/adverse-event-detail 路由存在且 auth:true", () => {
    const route = adverseEventDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/adverse-event-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
