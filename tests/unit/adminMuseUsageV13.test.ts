/**
 * 健澜科技 jlmedaios - 行政个人智能体使用统计 V13 单测（M320-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyAdminScenariosV13,
  computeAdminCallCountV13,
  computeAdminSatisfactionV13,
  type AdminMuseFeedbackV13,
  type AdminMuseUsageV13,
} from "../../src/bff/aggregators/adminMuseUsageV13Aggregator";
import { adminMuseUsageV13Routes } from "../../src/bff/routes/adminMuseUsageV13";

const usages: AdminMuseUsageV13[] = [
  { usageId: "u1", adminId: "a1", scenario: "document" },
  { usageId: "u2", adminId: "a1", scenario: "document" },
  { usageId: "u3", adminId: "a1", scenario: "document" },
  { usageId: "u4", adminId: "a1", scenario: "meetingMinutes" },
  { usageId: "u5", adminId: "a2", scenario: "meetingMinutes" },
  { usageId: "u6", adminId: "a2", scenario: "meetingMinutes" },
  { usageId: "u7", adminId: "a2", scenario: "dataReport" },
  { usageId: "u8", adminId: "a3", scenario: "dataReport" },
  { usageId: "u9", adminId: "a3", scenario: "dataReport" },
  { usageId: "u10", adminId: "a3", scenario: "document" },
];

const feedbacks: AdminMuseFeedbackV13[] = [
  { feedbackId: "f1", adminId: "a1", isSatisfied: true },
  { feedbackId: "f2", adminId: "a1", isSatisfied: true },
  { feedbackId: "f3", adminId: "a1", isSatisfied: true },
  { feedbackId: "f4", adminId: "a1", isSatisfied: true },
  { feedbackId: "f5", adminId: "a1", isSatisfied: true },
  { feedbackId: "f6", adminId: "a1", isSatisfied: true },
  { feedbackId: "f7", adminId: "a1", isSatisfied: true },
  { feedbackId: "f8", adminId: "a1", isSatisfied: true },
  { feedbackId: "f9", adminId: "a1", isSatisfied: false },
  { feedbackId: "f10", adminId: "a1", isSatisfied: false },
];

describe("computeAdminCallCountV13", () => {
  // 算式：a1 调用 = u1+u2+u3+u4 = 4
  it("a1 callCount = 4", () => {
    expect(computeAdminCallCountV13(usages, "a1")).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeAdminCallCountV13([], "a1")).toBe(0);
  });
});

describe("classifyAdminScenariosV13", () => {
  // 算式：document = u1+u2+u3+u10 = 4
  // meetingMinutes = u4+u5+u6 = 3
  // dataReport = u7+u8+u9 = 3
  it("document=4, meetingMinutes=3, dataReport=3", () => {
    const d = classifyAdminScenariosV13(usages);
    expect(d.document).toBe(4);
    expect(d.meetingMinutes).toBe(3);
    expect(d.dataReport).toBe(3);
  });
});

describe("computeAdminSatisfactionV13", () => {
  // 算式：a1 10 反馈中满意 = f1-f8 = 8 → 8/10×100 = 80
  it("a1 satisfaction = 80", () => {
    expect(computeAdminSatisfactionV13(feedbacks, "a1")).toBe(80);
  });
});

describe("adminMuseUsageV13Routes 读路由", () => {
  it("GET /api/v1/admin-muse-usage 路由存在且 auth:true", () => {
    const route = adminMuseUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/admin-muse-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
