/**
 * 健澜科技 jlmedaios - 门诊等候时长 V13 单测（M337-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePaymentWaitV13,
  computePharmacyWaitV13,
  computeRegistrationWaitV13,
  computeTriageWaitV13,
  type OutpatientWaitRecordV13,
} from "../../src/bff/aggregators/outpatientWaitV13Aggregator";
import { outpatientWaitV13Routes } from "../../src/bff/routes/outpatientWaitV13";

const records: OutpatientWaitRecordV13[] = [
  { registrationWaitMinutes: 5, triageWaitMinutes: 10, paymentWaitMinutes: 3, pharmacyWaitMinutes: 4 },
  { registrationWaitMinutes: 10, triageWaitMinutes: 20, paymentWaitMinutes: 6, pharmacyWaitMinutes: 8 },
  { registrationWaitMinutes: 15, triageWaitMinutes: 30, paymentWaitMinutes: 9, pharmacyWaitMinutes: 12 },
];

describe("computeRegistrationWaitV13", () => {
  // 算式：(5+10+15)/3 = 30/3 = 10.0
  it("挂号平均等候 = 10.0 分钟", () => {
    expect(computeRegistrationWaitV13(records)).toBe(10.0);
  });
  it("空态 → 0", () => {
    expect(computeRegistrationWaitV13([])).toBe(0);
  });
});

describe("computeTriageWaitV13", () => {
  // 算式：(10+20+30)/3 = 60/3 = 20.0
  it("候诊平均等候 = 20.0 分钟", () => {
    expect(computeTriageWaitV13(records)).toBe(20.0);
  });
});

describe("computePaymentWaitV13", () => {
  // 算式：(3+6+9)/3 = 18/3 = 6.0
  it("缴费平均等候 = 6.0 分钟", () => {
    expect(computePaymentWaitV13(records)).toBe(6.0);
  });
});

describe("computePharmacyWaitV13", () => {
  // 算式：(4+8+12)/3 = 24/3 = 8.0
  it("取药平均等候 = 8.0 分钟", () => {
    expect(computePharmacyWaitV13(records)).toBe(8.0);
  });
});

describe("outpatientWaitV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-wait 路由存在且 auth:true", () => {
    const route = outpatientWaitV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-wait",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
