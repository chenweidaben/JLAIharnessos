/**
 * 健澜科技 jlmedaios - 不良事件上报管理 V13 单测（M439-A，患者安全与医疗风险管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdverseEventReportingCountV13,
  computeAdverseEventReportingRcaCompletionRateV13,
  computeAdverseEventReportingTimelinessRateV13,
  type AdverseEventReportingRecordV13,
} from "../../src/bff/aggregators/adverseEventReportingV13Aggregator";
import { adverseEventReportingV13Routes } from "../../src/bff/routes/adverseEventReportingV13";

const records: AdverseEventReportingRecordV13[] = [
  { timelyReported: 950, totalReported: 1000, completedRca: 900, shouldRca: 1000 },
  { timelyReported: 950, totalReported: 1000, completedRca: 900, shouldRca: 1000 },
];

describe("computeAdverseEventReportingCountV13", () => {
  // 算式：records.length = 2 例（两条记录）
  it("上报例数 = 2 例（records.length 直接返回）", () => {
    expect(computeAdverseEventReportingCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeAdverseEventReportingCountV13([])).toBe(0);
  });
});

describe("computeAdverseEventReportingTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("上报及时率 = 95.00%", () => {
    expect(computeAdverseEventReportingTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("computeAdverseEventReportingRcaCompletionRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("根因分析完成率 = 90.00%", () => {
    expect(computeAdverseEventReportingRcaCompletionRateV13(records)).toBe(90.00);
  });
});

describe("adverseEventReportingV13Routes 读路由", () => {
  it("GET /api/v1/adverse-event-reporting 路由存在且 auth:true", () => {
    const route = adverseEventReportingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/adverse-event-reporting",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
