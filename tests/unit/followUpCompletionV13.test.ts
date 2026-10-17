/**
 * 健澜科技 jlmedaios - 出院随访率 V13 单测（M347-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeActualFollowUpV13,
  computeFollowUpRateV13,
  computeShouldFollowUpV13,
  type FollowUpRecordV13,
} from "../../src/bff/aggregators/followUpCompletionV13Aggregator";
import { followUpCompletionV13Routes } from "../../src/bff/routes/followUpCompletionV13";

const records: FollowUpRecordV13[] = [
  { shouldFollowUp: 50, actualFollowUp: 45 },
  { shouldFollowUp: 50, actualFollowUp: 50 },
];

describe("computeShouldFollowUpV13", () => {
  // 算式：50+50 = 100
  it("应随访人数 = 100", () => {
    expect(computeShouldFollowUpV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeShouldFollowUpV13([])).toBe(0);
  });
});

describe("computeActualFollowUpV13", () => {
  // 算式：45+50 = 95
  it("已随访人数 = 95", () => {
    expect(computeActualFollowUpV13(records)).toBe(95);
  });
});

describe("computeFollowUpRateV13", () => {
  // 算式：95/100×100 = 95.00
  it("随访完成率 = 95.00%", () => {
    expect(computeFollowUpRateV13(records)).toBe(95.00);
  });
});

describe("followUpCompletionV13Routes 读路由", () => {
  it("GET /api/v1/follow-up-completion 路由存在且 auth:true", () => {
    const route = followUpCompletionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/follow-up-completion",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
