/**
 * 健澜科技 jlmedaios - 信用就医先诊后付 V5 单测（M271-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCreditV5,
  buildCreditTreatmentV5Report,
  settlePostPayV5,
} from "../../src/bff/aggregators/creditTreatmentV5ReportAggregator";

describe("assessCreditV5", () => {
  it("履约20次→score=90 tier=A", () => {
    expect(assessCreditV5("张三", 20).score).toBe(90);
    expect(assessCreditV5("张三", 20).tier).toBe("A");
  });
});

describe("settlePostPayV5", () => {
  it("账单500额度1000→paid=500 status=通过", () => {
    expect(settlePostPayV5(500, 1000).status).toBe("通过");
    expect(settlePostPayV5(500, 1000).paid).toBe(500);
  });
});

describe("buildCreditTreatmentV5Report", () => {
  it("生成信用就医数据", () => {
    expect(buildCreditTreatmentV5Report("30d").creditTreatment.firstVisitLaterPay).toBeGreaterThan(0);
  });
  it("生成后付费结算数据", () => {
    expect(buildCreditTreatmentV5Report("30d").postPaySettlement.dischargeUnified).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildCreditTreatmentV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
