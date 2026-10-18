/**
 * 健澜科技 jlmedaios - 门诊收费管理 V13 单测（M448-A，财务与收费管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientBillingAccuracyRateV13,
  computeOutpatientBillingRefundRateV13,
  computeOutpatientBillingResponseMinutesV13,
  type OutpatientBillingMgmtRecordV13,
} from "../../src/bff/aggregators/outpatientBillingMgmtV13Aggregator";
import { outpatientBillingMgmtV13Routes } from "../../src/bff/routes/outpatientBillingMgmtV13";

const records: OutpatientBillingMgmtRecordV13[] = [
  { accurate: 950, refund: 30, total: 1000, avgResponseMinutes: 2.5 },
  { accurate: 950, refund: 30, total: 1000, avgResponseMinutes: 2.5 },
];

describe("computeOutpatientBillingAccuracyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("门诊收费准确率 = 95.00%", () => {
    expect(computeOutpatientBillingAccuracyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientBillingAccuracyRateV13([])).toBe(0);
  });
});

describe("computeOutpatientBillingRefundRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00（反向，越低越好）
  it("门诊退费率 = 3.00%（反向，越低越好）", () => {
    expect(computeOutpatientBillingRefundRateV13(records)).toBe(3.00);
  });
});

describe("computeOutpatientBillingResponseMinutesV13", () => {
  // 算式：avg=(2.5+2.5)/2=2.5，Math.ceil(2.5) = 3 分钟
  it("门诊收费响应时长 = 3 分钟（平均响应时长 Math.ceil 整分钟）", () => {
    expect(computeOutpatientBillingResponseMinutesV13(records)).toBe(3);
  });
});

describe("outpatientBillingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-billing-mgmt 路由存在且 auth:true", () => {
    const route = outpatientBillingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-billing-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
