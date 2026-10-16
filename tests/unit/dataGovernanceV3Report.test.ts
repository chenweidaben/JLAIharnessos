/**
 * 健澜科技 jlmedaios - 数据治理 V3 纯函数单测（M244-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessDataQualityV3,
  buildDataGovernanceV3Report,
  classifyDataLevelV3,
} from "../../src/bff/aggregators/dataGovernanceV3ReportAggregator";

describe("assessDataQualityV3", () => {
  it("六维均96 → 优秀", () => {
    expect(assessDataQualityV3({ completeness: 96, accuracy: 98, consistency: 95, timeliness: 97, uniqueness: 99, compliance: 100 }).excellent).toBe(true);
  });
});

describe("classifyDataLevelV3", () => {
  it("高敏感 → L3脱敏", () => {
    expect(classifyDataLevelV3({ sensitivity: "高", volume: 1000 }).level).toBe("L3");
  });
});

describe("buildDataGovernanceV3Report", () => {
  it("生成标准数据", () => {
    const r = buildDataGovernanceV3Report("30d");
    expect(r.standards.dataElement).toBeGreaterThan(0);
  });

  it("生成质量数据", () => {
    const r = buildDataGovernanceV3Report("30d");
    expect(r.quality.completeness).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDataGovernanceV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
