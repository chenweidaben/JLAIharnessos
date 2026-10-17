/**
 * 健澜科技 jlmedaios - 再入院分析管理 V13 单测（M427-C，换名避让旧版 readmissionMgmtV13（M411，-analysis 后缀））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compute31DayReadmissionRateV13,
  computeReadmissionCauseDistributionRateV13,
  computeReadmissionInterventionRateV13,
  type ReadmissionAnalysisMgmtRecordV13,
} from "../../src/bff/aggregators/readmissionAnalysisMgmtV13Aggregator";
import { readmissionAnalysisMgmtV13Routes } from "../../src/bff/routes/readmissionAnalysisMgmtV13";

const records: ReadmissionAnalysisMgmtRecordV13[] = [
  { readmit31: 30, dischargeTotal: 1000, causeChronicWorsening: 40, interventionDone: 85, readmitTotal: 100 },
  { readmit31: 30, dischargeTotal: 1000, causeChronicWorsening: 40, interventionDone: 85, readmitTotal: 100 },
];

describe("compute31DayReadmissionRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00
  it("31 天再入院率 = 3.00%", () => {
    expect(compute31DayReadmissionRateV13(records)).toBe(3.00);
  });
  it("空态 → 0", () => {
    expect(compute31DayReadmissionRateV13([])).toBe(0);
  });
});

describe("computeReadmissionCauseDistributionRateV13", () => {
  // 算式：(40+40)/(100+100)×100 = 80/200×100 = 40.00（单类原因占比）
  it("再入院原因分布率 = 40.00%（慢性病加重占比）", () => {
    expect(computeReadmissionCauseDistributionRateV13(records)).toBe(40.00);
  });
});

describe("computeReadmissionInterventionRateV13", () => {
  // 算式：(85+85)/(100+100)×100 = 170/200×100 = 85.00
  it("再入院干预措施落实率 = 85.00%", () => {
    expect(computeReadmissionInterventionRateV13(records)).toBe(85.00);
  });
});

describe("readmissionAnalysisMgmtV13Routes 读路由", () => {
  it("GET /api/v1/readmission-analysis-mgmt 路由存在且 auth:true", () => {
    const route = readmissionAnalysisMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/readmission-analysis-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
