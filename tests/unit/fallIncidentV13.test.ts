/**
 * 健澜科技 jlmedaios - 跌倒坠床风险管理 V13 单测（M439-B，患者安全与医疗风险管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFallIncidentHighRiskAssessmentRateV13,
  computeFallIncidentInjuryClassificationRateV13,
  computeFallIncidentRateV13,
  type FallIncidentRecordV13,
} from "../../src/bff/aggregators/fallIncidentV13Aggregator";
import { fallIncidentV13Routes } from "../../src/bff/routes/fallIncidentV13";

const records: FallIncidentRecordV13[] = [
  { fallCount: 10, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, classifiedInjury: 950, totalFall: 1000 },
  { fallCount: 10, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, classifiedInjury: 950, totalFall: 1000 },
];

describe("computeFallIncidentRateV13", () => {
  // 算式：(10+10)/(10000+10000)×1000 = 20/20000×1000 = 1.00‰（千分率，反向，越低越好）
  it("跌倒发生率 = 1.00‰（千分率，反向，越低越好）", () => {
    expect(computeFallIncidentRateV13(records)).toBe(1.00);
  });
  it("空态 → 0", () => {
    expect(computeFallIncidentRateV13([])).toBe(0);
  });
});

describe("computeFallIncidentHighRiskAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("高危评估率 = 95.00%", () => {
    expect(computeFallIncidentHighRiskAssessmentRateV13(records)).toBe(95.00);
  });
});

describe("computeFallIncidentInjuryClassificationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("跌倒伤害分级率 = 95.00%", () => {
    expect(computeFallIncidentInjuryClassificationRateV13(records)).toBe(95.00);
  });
});

describe("fallIncidentV13Routes 读路由", () => {
  it("GET /api/v1/fall-incident 路由存在且 auth:true", () => {
    const route = fallIncidentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fall-incident",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
