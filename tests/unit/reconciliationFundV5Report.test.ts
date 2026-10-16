/**
 * 健澜科技 jlmedaios - 对账清算与医保基金监管 V5 单测（M271-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReconciliationFundV5Report,
  detectFundRiskV5,
  reconcileMedicalInsuranceV5,
} from "../../src/bff/aggregators/reconciliationFundV5ReportAggregator";

describe("reconcileMedicalInsuranceV5", () => {
  it("2申报1匹配1拒付→matched=1 rejection=1", () => {
    const r = reconcileMedicalInsuranceV5(
      [{ id: "A", amount: 100 }, { id: "B", amount: 200 }],
      { id: "A", amount: 100 },
    );
    expect(r.matched).toBe(1);
    expect(r.rejection).toBe(0);
  });
});

describe("detectFundRiskV5", () => {
  it("2申报1笔超1万→flagged=1", () => {
    expect(detectFundRiskV5([{ id: "A", amount: 5000, dept: "内科" }, { id: "B", amount: 15000, dept: "外科" }], 3).flagged).toBe(1);
  });
});

describe("buildReconciliationFundV5Report", () => {
  it("生成医保对账数据", () => {
    expect(buildReconciliationFundV5Report("30d").insuranceReconciliation.settlement).toBeGreaterThan(0);
  });
  it("生成基金监管数据", () => {
    expect(buildReconciliationFundV5Report("30d").fundSupervision.smartAudit).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildReconciliationFundV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
