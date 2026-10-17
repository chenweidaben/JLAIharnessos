/**
 * 健澜科技 jlmedaios - 护士个人智能体使用统计 V13 单测（M320-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyNurseScenariosV13,
  computeNurseCallCountV13,
  computeNurseHitRateV13,
  type NurseMuseFeedbackV13,
  type NurseMuseUsageV13,
} from "../../src/bff/aggregators/nurseMuseUsageV13Aggregator";
import { nurseMuseUsageV13Routes } from "../../src/bff/routes/nurseMuseUsageV13";

const usages: NurseMuseUsageV13[] = [
  { usageId: "u1", nurseId: "n1", scenario: "medicationCheck" },
  { usageId: "u2", nurseId: "n1", scenario: "medicationCheck" },
  { usageId: "u3", nurseId: "n1", scenario: "medicationCheck" },
  { usageId: "u4", nurseId: "n1", scenario: "carePlan" },
  { usageId: "u5", nurseId: "n2", scenario: "carePlan" },
  { usageId: "u6", nurseId: "n2", scenario: "carePlan" },
  { usageId: "u7", nurseId: "n2", scenario: "riskAlert" },
  { usageId: "u8", nurseId: "n3", scenario: "riskAlert" },
  { usageId: "u9", nurseId: "n3", scenario: "riskAlert" },
  { usageId: "u10", nurseId: "n3", scenario: "medicationCheck" },
];

const feedbacks: NurseMuseFeedbackV13[] = [
  { feedbackId: "f1", nurseId: "n1", isAdopted: true },
  { feedbackId: "f2", nurseId: "n1", isAdopted: true },
  { feedbackId: "f3", nurseId: "n1", isAdopted: true },
  { feedbackId: "f4", nurseId: "n1", isAdopted: true },
  { feedbackId: "f5", nurseId: "n1", isAdopted: true },
  { feedbackId: "f6", nurseId: "n1", isAdopted: true },
  { feedbackId: "f7", nurseId: "n1", isAdopted: true },
  { feedbackId: "f8", nurseId: "n1", isAdopted: true },
  { feedbackId: "f9", nurseId: "n1", isAdopted: false },
  { feedbackId: "f10", nurseId: "n1", isAdopted: false },
];

describe("computeNurseCallCountV13", () => {
  // 算式：n1 调用 = u1+u2+u3+u4 = 4
  it("n1 callCount = 4", () => {
    expect(computeNurseCallCountV13(usages, "n1")).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeNurseCallCountV13([], "n1")).toBe(0);
  });
});

describe("classifyNurseScenariosV13", () => {
  // 算式：medicationCheck = u1+u2+u3+u10 = 4
  // carePlan = u4+u5+u6 = 3
  // riskAlert = u7+u8+u9 = 3
  it("medicationCheck=4, carePlan=3, riskAlert=3", () => {
    const d = classifyNurseScenariosV13(usages);
    expect(d.medicationCheck).toBe(4);
    expect(d.carePlan).toBe(3);
    expect(d.riskAlert).toBe(3);
  });
});

describe("computeNurseHitRateV13", () => {
  // 算式：n1 10 反馈中采纳 = f1-f8 = 8 → 8/10×100 = 80
  it("n1 hitRate = 80", () => {
    expect(computeNurseHitRateV13(feedbacks, "n1")).toBe(80);
  });
});

describe("nurseMuseUsageV13Routes 读路由", () => {
  it("GET /api/v1/nurse-muse-usage 路由存在且 auth:true", () => {
    const route = nurseMuseUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nurse-muse-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
