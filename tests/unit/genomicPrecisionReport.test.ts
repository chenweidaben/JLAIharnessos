/**
 * 健澜科技 jlmedaios - 基因与精准医疗 纯函数单测（M237-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildGenomicPrecisionReport,
  interpretGenomicVariant,
  predictDrugResponse,
} from "../../src/bff/aggregators/genomicPrecisionReportAggregator";

describe("interpretGenomicVariant", () => {
  it("致病变异 → 致病分类", () => {
    expect(interpretGenomicVariant("致病变异BRCA1").pathogenic).toBe(true);
  });
});

describe("predictDrugResponse", () => {
  it("慢代谢+华法林 → 调整剂量", () => {
    expect(predictDrugResponse("慢代谢CYP2C9", "华法林").dose).toContain("调整");
  });
});

describe("buildGenomicPrecisionReport", () => {
  it("生成检测数据", () => {
    const r = buildGenomicPrecisionReport("30d");
    expect(r.testing.newborn).toBeGreaterThan(0);
  });

  it("生成肿瘤数据", () => {
    const r = buildGenomicPrecisionReport("30d");
    expect(r.oncology.targeted).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGenomicPrecisionReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
