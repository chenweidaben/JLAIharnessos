/**
 * 健澜科技 jlmedaios - 安宁疗护与缓和医疗 V5 单测（M272-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessPalliativeNeedV5,
  buildHospicePalliativeV5Report,
  managePainV5,
} from "../../src/bff/aggregators/hospicePalliativeV5ReportAggregator";

describe("assessPalliativeNeedV5", () => {
  it("预后2月症状4→安宁准入", () => {
    expect(assessPalliativeNeedV5(2, 4).eligible).toBe(true);
    expect(assessPalliativeNeedV5(2, 4).level).toBe("安宁");
  });
});

describe("managePainV5", () => {
  it("疼痛8分→阿片类+辅助药", () => {
    expect(managePainV5(8, 1).plan).toBe("阿片类+辅助药");
  });
});

describe("buildHospicePalliativeV5Report", () => {
  it("生成准入数据", () => {
    expect(buildHospicePalliativeV5Report("30d").admission.prognosis).toBeGreaterThan(0);
  });
  it("生成症状数据", () => {
    expect(buildHospicePalliativeV5Report("30d").symptom.pain).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildHospicePalliativeV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
