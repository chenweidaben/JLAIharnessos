/**
 * 健澜科技 jlmedaios - 病房质量管理 V13 单测（M429-D，M429 收官，-quality 后缀避让旧版 wardMgmtDetailV13（M417））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeWardHealthEducationCoverageRateV13,
  computeWardNursingPassRateV13,
  computeWardPatientSatisfactionRateV13,
  type WardQualityMgmtRecordV13,
} from "../../src/bff/aggregators/wardQualityMgmtV13Aggregator";
import { wardQualityMgmtV13Routes } from "../../src/bff/routes/wardQualityMgmtV13";

const records: WardQualityMgmtRecordV13[] = [
  { nursingPass: 980, nursingTotal: 1000, eduCovered: 950, inpatientTotal: 1000, satisfied: 990, surveyedTotal: 1000 },
  { nursingPass: 980, nursingTotal: 1000, eduCovered: 950, inpatientTotal: 1000, satisfied: 990, surveyedTotal: 1000 },
];

describe("computeWardNursingPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("病房护理合格率 = 98.00%", () => {
    expect(computeWardNursingPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeWardNursingPassRateV13([])).toBe(0);
  });
});

describe("computeWardHealthEducationCoverageRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病房健康教育覆盖率 = 95.00%", () => {
    expect(computeWardHealthEducationCoverageRateV13(records)).toBe(95.00);
  });
});

describe("computeWardPatientSatisfactionRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("病房患者满意度 = 99.00%", () => {
    expect(computeWardPatientSatisfactionRateV13(records)).toBe(99.00);
  });
});

describe("wardQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/ward-quality-mgmt 路由存在且 auth:true", () => {
    const route = wardQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ward-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
