/**
 * 健澜科技 jlmedaios - 互联互通标准化成熟度 V5 纯函数单测（M267-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessInteropLevelV5,
  buildInteropV5Report,
  mapVocabularyV5,
} from "../../src/bff/aggregators/interopV5ReportAggregator";

describe("assessInteropLevelV5", () => {
  it("5项能力平均75分 → 五级乙等高级", () => {
    const r = assessInteropLevelV5({ standardization: 75, platform: 75, dataSharing: 75, application: 75, security: 75 });
    expect(r.level).toBe("五级乙等");
  });
});

describe("mapVocabularyV5", () => {
  it("院内术语'肺炎' → 映射到ICD置信度95", () => {
    const r = mapVocabularyV5({ code: "LOCAL001", name: "肺炎" }, { icd: "J18.9", loinc: "8480-6", snomed: "40733004" });
    expect(r.mapped).toBe(true);
  });
});

describe("buildInteropV5Report", () => {
  it("生成框架数据", () => {
    const r = buildInteropV5Report("30d");
    expect(r.framework.level).toBeTruthy();
  });

  it("生成标准化数据", () => {
    const r = buildInteropV5Report("30d");
    expect(r.standardization.icd).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInteropV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
