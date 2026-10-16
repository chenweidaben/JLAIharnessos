/**
 * 健澜科技 jlmedaios - 数据资产 V4 纯函数单测（M253-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessDataQualityV4,
  buildDataAssetV4Report,
  classifyDataLevelV4,
} from "../../src/bff/aggregators/dataAssetV4ReportAggregator";

describe("assessDataQualityV4", () => {
  it("六维均95+ → 综合95达标", () => {
    expect(assessDataQualityV4({ completeness: 98, accuracy: 99, consistency: 97, timeliness: 95, uniqueness: 99, compliance: 100 }).adequate).toBe(true);
  });
});

describe("classifyDataLevelV4", () => {
  it("敏感度90 → L4敏感加密脱敏", () => {
    expect(classifyDataLevelV4({ type: "PHI", sensitivity: 90 }).level).toBe("L4敏感");
  });
});

describe("buildDataAssetV4Report", () => {
  it("生成目录数据", () => {
    const r = buildDataAssetV4Report("30d");
    expect(r.catalog.asset).toBeGreaterThan(0);
  });

  it("生成安全数据", () => {
    const r = buildDataAssetV4Report("30d");
    expect(r.security.classification).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDataAssetV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
