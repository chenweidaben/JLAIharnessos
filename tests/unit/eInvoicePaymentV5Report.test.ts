/**
 * 健澜科技 jlmedaios - 电子票据与移动支付 V5 单测（M271-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEInvoicePaymentV5Report,
  issueEInvoiceV5,
  reconcilePaymentV5,
} from "../../src/bff/aggregators/eInvoicePaymentV5ReportAggregator";

describe("issueEInvoiceV5", () => {
  it("金额100→已开具", () => {
    expect(issueEInvoiceV5(100, "张三").status).toBe("已开具");
  });
});

describe("reconcilePaymentV5", () => {
  it("2订单1匹配1差异→matched=1 discrepancy=1", () => {
    const r = reconcilePaymentV5(
      [{ id: "A", amount: 100 }, { id: "B", amount: 200 }],
      [{ id: "A", amount: 100 }, { id: "B", amount: 250 }],
    );
    expect(r.matched).toBe(1);
    expect(r.discrepancy).toBe(1);
  });
});

describe("buildEInvoicePaymentV5Report", () => {
  it("生成电子票据数据", () => {
    expect(buildEInvoicePaymentV5Report("30d").eInvoice.issue).toBeGreaterThan(0);
  });
  it("生成移动支付数据", () => {
    expect(buildEInvoicePaymentV5Report("30d").mobilePayment.wechat).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildEInvoicePaymentV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
