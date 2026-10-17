/**
 * 健澜科技 jlmedaios - 基层医疗协同 V13 单测（M324-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  countDownwardReferralsV13,
  countUpwardReferralsV13,
  computeGrassrootsRatioV13,
  type ReferralRecordV13,
} from "../../src/bff/aggregators/grassrootsMedicalV13Aggregator";
import { grassrootsMedicalV13Routes } from "../../src/bff/routes/grassrootsMedicalV13";

const referrals: ReferralRecordV13[] = [
  { referralType: "upward" },
  { referralType: "upward" },
  { referralType: "upward" },
  { referralType: "downward" },
  { referralType: "downward" },
];

describe("countUpwardReferralsV13", () => {
  // 算式：upward = 3
  it("上转次数 = 3", () => {
    expect(countUpwardReferralsV13(referrals)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(countUpwardReferralsV13([])).toBe(0);
  });
});

describe("countDownwardReferralsV13", () => {
  // 算式：downward = 2
  it("下转次数 = 2", () => {
    expect(countDownwardReferralsV13(referrals)).toBe(2);
  });
});

describe("computeGrassrootsRatioV13", () => {
  // 算式：2000/10000×100 = 20
  it("基层占比 = 20%", () => {
    expect(computeGrassrootsRatioV13(10000, 2000)).toBe(20);
  });
  // 算式：total=0 → 0
  it("total=0 → 0", () => {
    expect(computeGrassrootsRatioV13(0, 2000)).toBe(0);
  });
});

describe("grassrootsMedicalV13Routes 读路由", () => {
  it("GET /api/v1/grassroots-medical 路由存在且 auth:true", () => {
    const route = grassrootsMedicalV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/grassroots-medical",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
