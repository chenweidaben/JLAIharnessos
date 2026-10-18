/**
 * 健澜科技 jlmedaios - 重点学科建设管理 V13 单测（M456-A，学科建设与科研管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDisciplineConstructionAnnualAssessmentRateV13,
  computeDisciplineConstructionFundExecutionRateV13,
  computeDisciplineConstructionLeaderComplianceRateV13,
  type DisciplineConstructionMgmtRecordV13,
} from "../../src/bff/aggregators/disciplineConstructionMgmtV13Aggregator";
import { disciplineConstructionMgmtV13Routes } from "../../src/bff/routes/disciplineConstructionMgmtV13";

const records: DisciplineConstructionMgmtRecordV13[] = [
  { qualified: 950, totalDiscipline: 1000, compliant: 900, totalLeader: 1000, executed: 980, totalFund: 1000 },
  { qualified: 950, totalDiscipline: 1000, compliant: 900, totalLeader: 1000, executed: 980, totalFund: 1000 },
];

describe("computeDisciplineConstructionAnnualAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("重点学科年度考核合格率 = 95.00%", () => {
    expect(computeDisciplineConstructionAnnualAssessmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDisciplineConstructionAnnualAssessmentRateV13([])).toBe(0);
  });
});

describe("computeDisciplineConstructionLeaderComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("学科带头人履职达标率 = 90.00%", () => {
    expect(computeDisciplineConstructionLeaderComplianceRateV13(records)).toBe(90.00);
  });
});

describe("computeDisciplineConstructionFundExecutionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("学科经费执行率 = 98.00%", () => {
    expect(computeDisciplineConstructionFundExecutionRateV13(records)).toBe(98.00);
  });
});

describe("disciplineConstructionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/discipline-construction-mgmt 路由存在且 auth:true", () => {
    const route = disciplineConstructionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discipline-construction-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
