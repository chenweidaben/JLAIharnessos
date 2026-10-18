/**
 * 健澜科技 jlmedaios - 医院运营管理 V13 单测（M459-A，医院运营与健康管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHospitalOperationsAnalysisReportCompleteRateV13,
  computeHospitalOperationsDataReportTimelyRateV13,
  computeHospitalOperationsIndicatorComplianceRateV13,
  type HospitalOperationsMgmtRecordV13,
} from "../../src/bff/aggregators/hospitalOperationsMgmtV13Aggregator";
import { hospitalOperationsMgmtV13Routes } from "../../src/bff/routes/hospitalOperationsMgmtV13";

const records: HospitalOperationsMgmtRecordV13[] = [
  { timely: 950, totalReport: 1000, completed: 900, totalAnalysisReport: 1000, qualified: 980, totalIndicator: 1000 },
  { timely: 950, totalReport: 1000, completed: 900, totalAnalysisReport: 1000, qualified: 980, totalIndicator: 1000 },
];

describe("computeHospitalOperationsDataReportTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("运营数据上报及时率 = 95.00%", () => {
    expect(computeHospitalOperationsDataReportTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHospitalOperationsDataReportTimelyRateV13([])).toBe(0);
  });
});

describe("computeHospitalOperationsAnalysisReportCompleteRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("运营分析报告完成率 = 90.00%", () => {
    expect(computeHospitalOperationsAnalysisReportCompleteRateV13(records)).toBe(90.00);
  });
});

describe("computeHospitalOperationsIndicatorComplianceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("运营指标达标率 = 98.00%", () => {
    expect(computeHospitalOperationsIndicatorComplianceRateV13(records)).toBe(98.00);
  });
});

describe("hospitalOperationsMgmtV13Routes 读路由", () => {
  it("GET /api/v1/hospital-operations-mgmt 路由存在且 auth:true", () => {
    const route = hospitalOperationsMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hospital-operations-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
