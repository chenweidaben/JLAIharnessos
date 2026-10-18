/**
 * 健澜科技 jlmedaios - 管路滑脱风险管理 V13 单测（M439-D，M439 收官，患者安全与医疗风险管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTubeDislodgementHighRiskAssessmentRateV13,
  computeTubeDislodgementRateV13,
  computeTubeDislodgementReportingRateV13,
  type TubeDislodgementRecordV13,
} from "../../src/bff/aggregators/tubeDislodgementV13Aggregator";
import { tubeDislodgementV13Routes } from "../../src/bff/routes/tubeDislodgementV13";

const records: TubeDislodgementRecordV13[] = [
  { dislodgedTubes: 20, totalTubeDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, reportedDislodgement: 950, totalDislodgement: 1000 },
  { dislodgedTubes: 20, totalTubeDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, reportedDislodgement: 950, totalDislodgement: 1000 },
];

describe("computeTubeDislodgementRateV13", () => {
  // 算式：(20+20)/(10000+10000)×1000 = 40/20000×1000 = 2.00‰（千分率，反向，越低越好）
  it("管路滑脱率 = 2.00‰（千分率，反向，越低越好）", () => {
    expect(computeTubeDislodgementRateV13(records)).toBe(2.00);
  });
  it("空态 → 0", () => {
    expect(computeTubeDislodgementRateV13([])).toBe(0);
  });
});

describe("computeTubeDislodgementHighRiskAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("高危管路评估率 = 95.00%", () => {
    expect(computeTubeDislodgementHighRiskAssessmentRateV13(records)).toBe(95.00);
  });
});

describe("computeTubeDislodgementReportingRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("滑脱上报率 = 95.00%", () => {
    expect(computeTubeDislodgementReportingRateV13(records)).toBe(95.00);
  });
});

describe("tubeDislodgementV13Routes 读路由", () => {
  it("GET /api/v1/tube-dislodgement 路由存在且 auth:true", () => {
    const route = tubeDislodgementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/tube-dislodgement",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
