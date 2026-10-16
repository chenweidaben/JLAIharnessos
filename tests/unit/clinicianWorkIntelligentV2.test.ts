/**
 * 健澜科技 jlmedaios - 医护工作智能化 V2 纯函数单测（M235-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClinicianWorkIntelligentV2,
  generateClinicalNote,
  prioritizeClinicianTasks,
} from "../../src/bff/aggregators/clinicianWorkIntelligentV2Aggregator";

describe("generateClinicalNote", () => {
  it("胸痛上下文 → 生成病历", () => {
    expect(generateClinicalNote("胸痛").note).toContain("胸痛");
  });
});

describe("prioritizeClinicianTasks", () => {
  it("多任务 → 急症优先", () => {
    expect(prioritizeClinicianTasks("住院门诊", "高").top).toBe("急症");
  });
});

describe("buildClinicianWorkIntelligentV2", () => {
  it("生成病历数据", () => {
    const r = buildClinicianWorkIntelligentV2("30d");
    expect(r.documentation.autoGen).toBeGreaterThan(0);
  });

  it("生成决策数据", () => {
    const r = buildClinicianWorkIntelligentV2("30d");
    expect(r.decision.differential).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildClinicianWorkIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
