/**
 * 健澜科技 jlmedaios - 抗菌药物管理（统计）V13 单测（M368-C，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAntibioticDddsV13,
  computeAntibioticUsageRateV13,
  computeSpecialAntibioticUsageRateV13,
  type AntibioticMgmtStatsRecordV13,
} from "../../src/bff/aggregators/antibioticMgmtStatsV13Aggregator";
import { antibioticMgmtStatsV13Routes } from "../../src/bff/routes/antibioticMgmtStatsV13";

const records: AntibioticMgmtStatsRecordV13[] = [
  { visitCount: 1000, antibioticUsed: 300, ddds: 100.5, specialLevelUsed: 30 },
  { visitCount: 1000, antibioticUsed: 300, ddds: 100.5, specialLevelUsed: 30 },
];

describe("computeAntibioticUsageRateV13", () => {
  // 算式：(300+300)/(1000+1000) = 600/2000×100 = 30.00
  it("抗菌药物使用率 = 30.00%", () => {
    expect(computeAntibioticUsageRateV13(records)).toBe(30.00);
  });
  it("空态 → 0", () => {
    expect(computeAntibioticUsageRateV13([])).toBe(0);
  });
});

describe("computeAntibioticDddsV13", () => {
  // 算式：100.5+100.5 = 201.00
  it("使用强度 DDDs = 201.00", () => {
    expect(computeAntibioticDddsV13(records)).toBe(201.00);
  });
});

describe("computeSpecialAntibioticUsageRateV13", () => {
  // 算式：(30+30)/(300+300) = 60/600×100 = 10.00
  it("特殊级抗菌药物使用率 = 10.00%", () => {
    expect(computeSpecialAntibioticUsageRateV13(records)).toBe(10.00);
  });
});

describe("antibioticMgmtStatsV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-mgmt-stats 路由存在且 auth:true", () => {
    const route = antibioticMgmtStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-mgmt-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
