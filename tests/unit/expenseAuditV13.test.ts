/**
 * 健澜科技 jlmedaios - 医疗费用审核 V13 单测（M445-C，医保物价与费用管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeExpenseAuditAppealSuccessRateV13,
  computeExpenseAuditDischargeRecordRateV13,
  computeExpenseAuditUnreasonableProportionRateV13,
  type ExpenseAuditRecordV13,
} from "../../src/bff/aggregators/expenseAuditV13Aggregator";
import { expenseAuditV13Routes } from "../../src/bff/routes/expenseAuditV13";

const records: ExpenseAuditRecordV13[] = [
  { audited: 950, totalDischarge: 1000, unreasonableAmount: 50, totalAuditedAmount: 10000, appealSuccess: 900, totalAppeal: 1000 },
  { audited: 950, totalDischarge: 1000, unreasonableAmount: 50, totalAuditedAmount: 10000, appealSuccess: 900, totalAppeal: 1000 },
];

describe("computeExpenseAuditDischargeRecordRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("出院病历审核率 = 95.00%", () => {
    expect(computeExpenseAuditDischargeRecordRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeExpenseAuditDischargeRecordRateV13([])).toBe(0);
  });
});

describe("computeExpenseAuditUnreasonableProportionRateV13", () => {
  // 算式：(50+50)/(10000+10000)×100 = 100/20000×100 = 0.50（反向，越低越好）
  it("不合理费用占比 = 0.50%（反向，越低越好）", () => {
    expect(computeExpenseAuditUnreasonableProportionRateV13(records)).toBe(0.50);
  });
});

describe("computeExpenseAuditAppealSuccessRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("费用申诉成功率 = 90.00%", () => {
    expect(computeExpenseAuditAppealSuccessRateV13(records)).toBe(90.00);
  });
});

describe("expenseAuditV13Routes 读路由", () => {
  it("GET /api/v1/expense-audit 路由存在且 auth:true", () => {
    const route = expenseAuditV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/expense-audit",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
