/**
 * 健澜科技 jlmedaios - 抗菌药物管理（细节）V13 单测（M414-C，detail 避让旧版 antibioticUseDensityV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAntibioticTherapeuticUseSubmissionRateV13,
  computeClassIIncisionProphylacticAntibioticPassRateV13,
  computeSpecialLevelAntibioticConsultationRateV13,
  type AntibioticMgmtDetailRecordV13,
} from "../../src/bff/aggregators/antibioticMgmtDetailV13Aggregator";
import { antibioticMgmtDetailV13Routes } from "../../src/bff/routes/antibioticMgmtDetailV13";

const records: AntibioticMgmtDetailRecordV13[] = [
  { consulted: 95, specialUseTotal: 100, submitted: 800, therapeuticTotal: 1000, qualified: 900, prophylacticTotal: 1000 },
  { consulted: 95, specialUseTotal: 100, submitted: 800, therapeuticTotal: 1000, qualified: 900, prophylacticTotal: 1000 },
];

describe("computeSpecialLevelAntibioticConsultationRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("特殊使用级抗菌药物会诊率 = 95.00%", () => {
    expect(computeSpecialLevelAntibioticConsultationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSpecialLevelAntibioticConsultationRateV13([])).toBe(0);
  });
});

describe("computeAntibioticTherapeuticUseSubmissionRateV13", () => {
  // 算式：(800+800)/(1000+1000)×100 = 1600/2000×100 = 80.00
  it("抗菌药物治疗性使用送检率 = 80.00%", () => {
    expect(computeAntibioticTherapeuticUseSubmissionRateV13(records)).toBe(80.00);
  });
});

describe("computeClassIIncisionProphylacticAntibioticPassRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("Ⅰ类切口预防使用抗菌药物合格率 = 90.00%", () => {
    expect(computeClassIIncisionProphylacticAntibioticPassRateV13(records)).toBe(90.00);
  });
});

describe("antibioticMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/antibiotic-mgmt-detail 路由存在且 auth:true", () => {
    const route = antibioticMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/antibiotic-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
