/**
 * 健澜科技 jlmedaios - 双向转诊 V13 单测（M337-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCompletionRateV13,
  computeDownReferralCountV13,
  computeUpReferralCountV13,
  type ReferralRecordV13,
} from "../../src/bff/aggregators/referralV13Aggregator";
import { referralV13Routes } from "../../src/bff/routes/referralV13";

const records: ReferralRecordV13[] = [
  { upReferralCount: 50, downReferralCount: 40, completedCount: 90 },
  { upReferralCount: 30, downReferralCount: 20, completedCount: 36 },
];

describe("computeUpReferralCountV13", () => {
  // 算式：50+30 = 80
  it("上转人次 = 80", () => {
    expect(computeUpReferralCountV13(records)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeUpReferralCountV13([])).toBe(0);
  });
});

describe("computeDownReferralCountV13", () => {
  // 算式：40+20 = 60
  it("下转人次 = 60", () => {
    expect(computeDownReferralCountV13(records)).toBe(60);
  });
});

describe("computeCompletionRateV13", () => {
  // 算式：(90+36)/((50+30)+(40+20)) = 126/140×100 = 90
  it("完成率 = 90%", () => {
    expect(computeCompletionRateV13(records)).toBe(90);
  });
});

describe("referralV13Routes 读路由", () => {
  it("GET /api/v1/referral-stats 路由存在且 auth:true", () => {
    const route = referralV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/referral-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
