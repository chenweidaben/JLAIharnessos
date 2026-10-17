/**
 * 健澜科技 jlmedaios - 用血合理率 V13 单测（M333-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAutologousTransfusionRateV13,
  computeReasonableBloodUseRateV13,
  type BloodUseRecordV13,
} from "../../src/bff/aggregators/bloodUseV13Aggregator";
import { bloodUseV13Routes } from "../../src/bff/routes/bloodUseV13";

const records: BloodUseRecordV13[] = [
  { totalUseCount: 50, reasonableUseCount: 45, totalTransfusionCount: 50, autologousTransfusionCount: 5 },
];

describe("computeReasonableBloodUseRateV13", () => {
  // 算式：45/50×100 = 90
  it("合理用血率 = 90%", () => {
    expect(computeReasonableBloodUseRateV13(records)).toBe(90);
  });
  it("空态 → 0", () => {
    expect(computeReasonableBloodUseRateV13([])).toBe(0);
  });
});

describe("computeAutologousTransfusionRateV13", () => {
  // 算式：5/50×100 = 10
  it("自体输血率 = 10%", () => {
    expect(computeAutologousTransfusionRateV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeAutologousTransfusionRateV13([])).toBe(0);
  });
});

describe("bloodUseV13Routes 读路由", () => {
  it("GET /api/v1/blood-use 路由存在且 auth:true", () => {
    const route = bloodUseV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-use",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
