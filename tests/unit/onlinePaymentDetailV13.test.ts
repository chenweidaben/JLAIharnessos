/**
 * 健澜科技 jlmedaios - 线上支付明细 V13 单测（M399-C，避让旧版 onlinePaymentV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOnlinePaymentCountV13,
  computeOnlinePaymentRatioV13,
  computeRefundHandlingTimelyRateV13,
  type OnlinePaymentDetailRecordV13,
} from "../../src/bff/aggregators/onlinePaymentDetailV13Aggregator";
import { onlinePaymentDetailV13Routes } from "../../src/bff/routes/onlinePaymentDetailV13";

const records: OnlinePaymentDetailRecordV13[] = [
  { onlineCount: 600, totalCount: 1000, timelyRefundCount: 80, totalRefundCount: 100 },
  { onlineCount: 600, totalCount: 1000, timelyRefundCount: 80, totalRefundCount: 100 },
];

describe("computeOnlinePaymentCountV13", () => {
  // 算式：600+600 = 1200
  it("线上缴费笔数 = 1200 笔", () => {
    expect(computeOnlinePaymentCountV13(records)).toBe(1200);
  });
  it("空态 → 0", () => {
    expect(computeOnlinePaymentCountV13([])).toBe(0);
  });
});

describe("computeOnlinePaymentRatioV13", () => {
  // 算式：(600+600)/(1000+1000) = 1200/2000×100 = 60.00
  it("线上缴费占比 = 60.00%", () => {
    expect(computeOnlinePaymentRatioV13(records)).toBe(60.00);
  });
});

describe("computeRefundHandlingTimelyRateV13", () => {
  // 算式：(80+80)/(100+100) = 160/200×100 = 80.00
  it("退费处理及时率 = 80.00%", () => {
    expect(computeRefundHandlingTimelyRateV13(records)).toBe(80.00);
  });
});

describe("onlinePaymentDetailV13Routes 读路由", () => {
  it("GET /api/v1/online-payment-detail 路由存在且 auth:true", () => {
    const route = onlinePaymentDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/online-payment-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
