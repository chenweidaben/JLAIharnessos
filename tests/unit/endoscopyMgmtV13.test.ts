/**
 * 健澜科技 jlmedaios - 内镜管理 V13 单测（M417-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEndoscopyCleaningDisinfectionPassRateV13,
  computeEndoscopyPathologyMatchRateV13,
  computeEndoscopyTreatmentComplicationRateV13,
  type EndoscopyMgmtRecordV13,
} from "../../src/bff/aggregators/endoscopyMgmtV13Aggregator";
import { endoscopyMgmtV13Routes } from "../../src/bff/routes/endoscopyMgmtV13";

const records: EndoscopyMgmtRecordV13[] = [
  { cleaningQualified: 990, cleaningTotal: 1000, pathologyMatch: 950, endoscopyDiagnosisTotal: 1000, complication: 10, treatmentTotal: 1000 },
  { cleaningQualified: 990, cleaningTotal: 1000, pathologyMatch: 950, endoscopyDiagnosisTotal: 1000, complication: 10, treatmentTotal: 1000 },
];

describe("computeEndoscopyCleaningDisinfectionPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("内镜清洗消毒合格率 = 99.00%", () => {
    expect(computeEndoscopyCleaningDisinfectionPassRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeEndoscopyCleaningDisinfectionPassRateV13([])).toBe(0);
  });
});

describe("computeEndoscopyPathologyMatchRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("内镜诊断与病理符合率 = 95.00%", () => {
    expect(computeEndoscopyPathologyMatchRateV13(records)).toBe(95.00);
  });
});

describe("computeEndoscopyTreatmentComplicationRateV13", () => {
  // 算式：(10+10)/(1000+1000)×100 = 20/2000×100 = 1.00（反向指标，越低越好）
  it("内镜治疗并发症率 = 1.00%（反向指标）", () => {
    expect(computeEndoscopyTreatmentComplicationRateV13(records)).toBe(1.00);
  });
});

describe("endoscopyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/endoscopy-mgmt 路由存在且 auth:true", () => {
    const route = endoscopyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/endoscopy-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
