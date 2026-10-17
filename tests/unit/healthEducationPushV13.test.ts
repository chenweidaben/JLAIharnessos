/**
 * 健澜科技 jlmedaios - 健教材料推送统计 V13 单测（M316-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFeedbackRateV13,
  computeReadRateV13,
  countMaterialsByDiseaseV13,
  type EducationMaterialV13,
  type EducationRecordV13,
} from "../../src/bff/aggregators/healthEducationPushV13Aggregator";
import { healthEducationPushV13Routes } from "../../src/bff/routes/healthEducationPushV13";

const materials: EducationMaterialV13[] = [
  { materialId: "m1", disease: "hypertension" },
  { materialId: "m2", disease: "hypertension" },
  { materialId: "m3", disease: "diabetes" },
  { materialId: "m4", disease: "diabetes" },
  { materialId: "m5", disease: "diabetes" },
];

const records: EducationRecordV13[] = [
  { recordId: "r1", materialId: "m1", disease: "hypertension", isRead: true, hasFeedback: true },
  { recordId: "r2", materialId: "m1", disease: "hypertension", isRead: true, hasFeedback: true },
  { recordId: "r3", materialId: "m1", disease: "hypertension", isRead: true, hasFeedback: true },
  { recordId: "r4", materialId: "m2", disease: "hypertension", isRead: true, hasFeedback: false },
  { recordId: "r5", materialId: "m2", disease: "hypertension", isRead: true, hasFeedback: false },
  { recordId: "r6", materialId: "m2", disease: "hypertension", isRead: true, hasFeedback: false },
  { recordId: "r7", materialId: "m3", disease: "diabetes", isRead: true, hasFeedback: false },
  { recordId: "r8", materialId: "m3", disease: "diabetes", isRead: false, hasFeedback: false },
  { recordId: "r9", materialId: "m4", disease: "diabetes", isRead: false, hasFeedback: false },
  { recordId: "r10", materialId: "m5", disease: "diabetes", isRead: false, hasFeedback: false },
];

describe("countMaterialsByDiseaseV13", () => {
  // 算式：hypertension 2 个（m1/m2）；diabetes 3 个（m3/m4/m5）
  it("hypertension=2, diabetes=3", () => {
    const counts = countMaterialsByDiseaseV13(materials);
    expect(counts.find((c) => c.disease === "hypertension")?.count).toBe(2);
    expect(counts.find((c) => c.disease === "diabetes")?.count).toBe(3);
  });
  it("空态 → []", () => {
    expect(countMaterialsByDiseaseV13([]).length).toBe(0);
  });
});

describe("computeReadRateV13", () => {
  // 算式：10 推送中已读 = r1-r7 = 7
  // readRate = 7/10×100 = 70
  it("readRate = 70", () => {
    expect(computeReadRateV13(records)).toBe(70);
  });
  it("空态 → 0", () => {
    expect(computeReadRateV13([])).toBe(0);
  });
});

describe("computeFeedbackRateV13", () => {
  // 算式：7 已读中有反馈 = r1/r2/r3 = 3
  // feedbackRate = 3/7×100 = 42.857... → round = 43
  it("feedbackRate = 43", () => {
    expect(computeFeedbackRateV13(records)).toBe(43);
  });
});

describe("healthEducationPushV13Routes 读路由", () => {
  it("GET /api/v1/health-education-push 路由存在且 auth:true", () => {
    const route = healthEducationPushV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/health-education-push",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
