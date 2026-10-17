/**
 * 健澜科技 jlmedaios - 在线支付 V13 单测（M367-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOnlinePaymentAmountV13,
  computeOnlinePaymentCountV13,
  computePaymentSuccessRateV13,
  type OnlinePaymentRecordV13,
} from "../../src/bff/aggregators/onlinePaymentV13Aggregator";
import { onlinePaymentV13Routes } from "../../src/bff/routes/onlinePaymentV13";

const records: OnlinePaymentRecordV13[] = [
  { paymentCount: 1000, paymentAmount: 50000, paymentSuccess: 980 },
  { paymentCount: 1000, paymentAmount: 50000, paymentSuccess: 980 },
];

describe("computeOnlinePaymentCountV13", () => {
  // 算式：1000+1000 = 2000
  it("在线支付笔数 = 2000", () => {
    expect(computeOnlinePaymentCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeOnlinePaymentCountV13([])).toBe(0);
  });
});

describe("computeOnlinePaymentAmountV13", () => {
  // 算式：50000+50000 = 100000.00
  it("在线支付金额 = 100000.00 元", () => {
    expect(computeOnlinePaymentAmountV13(records)).toBe(100000.00);
  });
});

describe("computePaymentSuccessRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("支付成功率 = 98.00%", () => {
    expect(computePaymentSuccessRateV13(records)).toBe(98.00);
  });
});

describe("onlinePaymentV13Routes 读路由", () => {
  it("GET /api/v1/online-payment 路由存在且 auth:true", () => {
    const route = onlinePaymentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/online-payment",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
