/**
 * 健澜科技 jlmedaios - 新生儿 V13 单测（M349-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeLowApgarRatioV13,
  computeLowBirthWeightRatioV13,
  computeNICUTransferRatioV13,
  type NewbornCareRecordV13,
} from "../../src/bff/aggregators/newbornCareV13Aggregator";
import { newbornCareV13Routes } from "../../src/bff/routes/newbornCareV13";

const records: NewbornCareRecordV13[] = [
  { lowApgarCount: 3, lowBirthWeightCount: 3, nicuTransferCount: 2, totalNewbornCount: 50 },
  { lowApgarCount: 2, lowBirthWeightCount: 2, nicuTransferCount: 1, totalNewbornCount: 50 },
];

describe("computeLowApgarRatioV13", () => {
  // 算式：(3+2)/(50+50) = 5/100×100 = 5.00
  it("Apgar≤7 占比 = 5.00%", () => {
    expect(computeLowApgarRatioV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeLowApgarRatioV13([])).toBe(0);
  });
});

describe("computeLowBirthWeightRatioV13", () => {
  // 算式：(3+2)/(50+50) = 5/100×100 = 5.00
  it("低体重儿率 = 5.00%", () => {
    expect(computeLowBirthWeightRatioV13(records)).toBe(5.00);
  });
});

describe("computeNICUTransferRatioV13", () => {
  // 算式：(2+1)/(50+50) = 3/100×100 = 3.00
  it("NICU 转入率 = 3.00%", () => {
    expect(computeNICUTransferRatioV13(records)).toBe(3.00);
  });
});

describe("newbornCareV13Routes 读路由", () => {
  it("GET /api/v1/newborn-care 路由存在且 auth:true", () => {
    const route = newbornCareV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/newborn-care",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
