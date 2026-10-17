/**
 * 健澜科技 jlmedaios - SOP 引用次数回灌飞轮分 V13 单测（M309-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  creditDoctorBySopUsageV13,
  rollbackSopUsageToFlywheelV13,
  trackSopUsageV13,
  type DoctorCreditV13,
} from "../../src/bff/aggregators/sopUsageV13Aggregator";
import { sopUsageV13Routes } from "../../src/bff/routes/sopUsageV13";

const doctors: DoctorCreditV13[] = [
  { doctorId: "d1", baseScore: 50, usageCount: 5 },
  { doctorId: "d2", baseScore: 40, usageCount: 4 },
  { doctorId: "d3", baseScore: 30, usageCount: 3 },
];

describe("trackSopUsageV13", () => {
  it("返回 sopId + doctorId", () => {
    const r = trackSopUsageV13("s1", "d1");
    expect(r.sopId).toBe("s1");
    expect(r.doctorId).toBe("d1");
  });
});

describe("creditDoctorBySopUsageV13", () => {
  // 算式：d1 base=50, usage=5 → +5×2 = +10 → 60
  it("d1: 50 + 5×2 = 60", () => {
    expect(creditDoctorBySopUsageV13(doctors[0], 5)).toBe(60);
  });
  // 算式：base=95, usage=100 → 95+200=295, clamp 100
  it("上限 100", () => {
    expect(creditDoctorBySopUsageV13({ doctorId: "x", baseScore: 95, usageCount: 100 }, 100)).toBe(100);
  });
});

describe("rollbackSopUsageToFlywheelV13", () => {
  // 算式：totalUsage = 5+4+3 = 12
  // 回灌加分 = 12×0.1 = 1.2
  // newScore = 66.6 + 1.2 = 67.8
  it("66.6 + 12×0.1 = 67.8", () => {
    expect(rollbackSopUsageToFlywheelV13(doctors, 66.6)).toBe(67.8);
  });
  it("空态 → 返回原分", () => {
    expect(rollbackSopUsageToFlywheelV13([], 66.6)).toBe(66.6);
  });
});

describe("sopUsageV13Routes 读路由", () => {
  it("GET /api/v1/sop-usage 路由存在且 auth:true", () => {
    const route = sopUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/sop-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
