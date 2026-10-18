/**
 * 健澜科技 jlmedaios - 住院收费管理 V13 单测（M448-B，财务与收费管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientBillingDepositSufficiencyRateV13,
  computeInpatientBillingDischargeSettlementTimelinessRateV13,
  computeInpatientBillingSettlementAccuracyRateV13,
  type InpatientBillingMgmtRecordV13,
} from "../../src/bff/aggregators/inpatientBillingMgmtV13Aggregator";
import { inpatientBillingMgmtV13Routes } from "../../src/bff/routes/inpatientBillingMgmtV13";

const records: InpatientBillingMgmtRecordV13[] = [
  { accurate: 950, totalSettle: 1000, sufficient: 900, totalPatient: 1000, timely: 980, totalDischarge: 1000 },
  { accurate: 950, totalSettle: 1000, sufficient: 900, totalPatient: 1000, timely: 980, totalDischarge: 1000 },
];

describe("computeInpatientBillingSettlementAccuracyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("住院费用结算准确率 = 95.00%", () => {
    expect(computeInpatientBillingSettlementAccuracyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeInpatientBillingSettlementAccuracyRateV13([])).toBe(0);
  });
});

describe("computeInpatientBillingDepositSufficiencyRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("住院预交金充足率 = 90.00%", () => {
    expect(computeInpatientBillingDepositSufficiencyRateV13(records)).toBe(90.00);
  });
});

describe("computeInpatientBillingDischargeSettlementTimelinessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("出院结算及时率 = 98.00%", () => {
    expect(computeInpatientBillingDischargeSettlementTimelinessRateV13(records)).toBe(98.00);
  });
});

describe("inpatientBillingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/inpatient-billing-mgmt 路由存在且 auth:true", () => {
    const route = inpatientBillingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/inpatient-billing-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
