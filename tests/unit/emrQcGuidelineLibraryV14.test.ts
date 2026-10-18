/**
 * 健澜科技 jlmedaios - 质控指南库 V14 单测（M505-C）
 *
 * 测试 buildGuideline 构建、filterGuidelines 筛选、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildGuideline,
  filterGuidelines,
  type GuidelineLibraryV14,
} from "../../src/bff/aggregators/emrQcGuidelineLibraryV14Aggregator";
import { emrQcGuidelineLibraryV14Routes } from "../../src/bff/routes/emrQcGuidelineLibraryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildGuideline 内科诊疗指南", () => {
  // 手算：title='内科诊疗指南', specialty='内科', year=2025 → 正确构建
  it("title='内科诊疗指南', specialty='内科', year=2025 → 正确构建", () => {
    const guideline: GuidelineLibraryV14 = buildGuideline("内科诊疗指南", "内科", 2025);
    expect(guideline.title).toBe("内科诊疗指南");
    expect(guideline.specialty).toBe("内科");
    expect(guideline.year).toBe(2025);
  });
});

describe("filterGuidelines 内科", () => {
  // 手算：3 条指南（内科2025, 外科2024, 内科2026），specialty='内科' → 返回 2 条（内科诊疗指南、内科用药指南）
  it("3 条指南，specialty='内科' → 返回 2 条", () => {
    const guidelines: GuidelineLibraryV14[] = [
      buildGuideline("内科诊疗指南", "内科", 2025),
      buildGuideline("外科手术指南", "外科", 2024),
      buildGuideline("内科用药指南", "内科", 2026),
    ];
    const result = filterGuidelines(guidelines, "内科");
    expect(result.length).toBe(2);
  });
});

describe("filterGuidelines 儿科", () => {
  // 手算：3 条指南，specialty='儿科' → 无匹配，返回 0 条
  it("specialty='儿科' → 返回 0 条", () => {
    const guidelines: GuidelineLibraryV14[] = [
      buildGuideline("内科诊疗指南", "内科", 2025),
      buildGuideline("外科手术指南", "外科", 2024),
      buildGuideline("内科用药指南", "内科", 2026),
    ];
    const result = filterGuidelines(guidelines, "儿科");
    expect(result.length).toBe(0);
  });
});

describe("buildGuideline 外科手术指南", () => {
  // 手算：title='外科手术指南', specialty='外科', year=2024 → 正确构建
  it("title='外科手术指南', specialty='外科', year=2024 → 正确构建", () => {
    const guideline: GuidelineLibraryV14 = buildGuideline("外科手术指南", "外科", 2024);
    expect(guideline.title).toBe("外科手术指南");
    expect(guideline.specialty).toBe("外科");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-guideline-library auth:true", () => {
    const def = (emrQcGuidelineLibraryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-guideline-library");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
