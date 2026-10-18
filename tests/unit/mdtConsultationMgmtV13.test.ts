/**
 * 健澜科技 jlmedaios - 多学科诊疗MDT管理 V13 单测（M459-D，M459 收官，医院运营与健康管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMdtConsultationApplicationTimelyRateV13,
  computeMdtConsultationConductRateV13,
  computeMdtConsultationPlanExecutionRateV13,
  type MdtConsultationMgmtRecordV13,
} from "../../src/bff/aggregators/mdtConsultationMgmtV13Aggregator";
import { mdtConsultationMgmtV13Routes } from "../../src/bff/routes/mdtConsultationMgmtV13";

const records: MdtConsultationMgmtRecordV13[] = [
  { timely: 950, totalApply: 1000, conducted: 900, totalConduct: 1000, executed: 980, totalPlan: 1000 },
  { timely: 950, totalApply: 1000, conducted: 900, totalConduct: 1000, executed: 980, totalPlan: 1000 },
];

describe("computeMdtConsultationApplicationTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("MDT申请及时率 = 95.00%", () => {
    expect(computeMdtConsultationApplicationTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMdtConsultationApplicationTimelyRateV13([])).toBe(0);
  });
});

describe("computeMdtConsultationConductRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("MDT开展率 = 90.00%", () => {
    expect(computeMdtConsultationConductRateV13(records)).toBe(90.00);
  });
});

describe("computeMdtConsultationPlanExecutionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("MDT方案执行率 = 98.00%", () => {
    expect(computeMdtConsultationPlanExecutionRateV13(records)).toBe(98.00);
  });
});

describe("mdtConsultationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/mdt-consultation-mgmt 路由存在且 auth:true", () => {
    const route = mdtConsultationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/mdt-consultation-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
