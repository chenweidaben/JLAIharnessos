/**
 * 健澜科技 jlmedaios - 再入院管理 V13 单测（M411-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compute15DayReadmissionRateV13,
  compute31DayReadmissionRateV13,
  computeReadmissionCauseAnalysisCompletionRateV13,
  type ReadmissionMgmtRecordV13,
} from "../../src/bff/aggregators/readmissionMgmtV13Aggregator";
import { readmissionMgmtV13Routes } from "../../src/bff/routes/readmissionMgmtV13";

const records: ReadmissionMgmtRecordV13[] = [
  { readmit31: 30, readmit15: 15, dischargeTotal: 1000, analyzed: 25, readmitTotal: 30 },
  { readmit31: 30, readmit15: 15, dischargeTotal: 1000, analyzed: 25, readmitTotal: 30 },
];

describe("compute31DayReadmissionRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00
  it("31天再入院率 = 3.00%", () => {
    expect(compute31DayReadmissionRateV13(records)).toBe(3.00);
  });
  it("空态 → 0", () => {
    expect(compute31DayReadmissionRateV13([])).toBe(0);
  });
});

describe("compute15DayReadmissionRateV13", () => {
  // 算式：(15+15)/(1000+1000)×100 = 30/2000×100 = 1.50
  it("15天再入院率 = 1.50%", () => {
    expect(compute15DayReadmissionRateV13(records)).toBe(1.50);
  });
});

describe("computeReadmissionCauseAnalysisCompletionRateV13", () => {
  // 算式：(25+25)/(30+30)×100 = 50/60×100 = 83.33
  it("再入院原因分析完成率 = 83.33%", () => {
    expect(computeReadmissionCauseAnalysisCompletionRateV13(records)).toBe(83.33);
  });
});

describe("readmissionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/readmission-mgmt 路由存在且 auth:true", () => {
    const route = readmissionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/readmission-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
