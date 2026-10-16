/**
 * 健澜科技 jlmedaios - 基因精准 V2 纯函数单测（M247-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildGenomicPrecisionV2Report,
  interpretGenomicVariantV2,
  predictDrugResponseV2,
} from "../../src/bff/aggregators/genomicPrecisionV2ReportAggregator";

describe("interpretGenomicVariantV2", () => {
  it("BRCA1致病 → 可干预", () => {
    expect(interpretGenomicVariantV2({ gene: "BRCA1", pathogenicity: "致病" }).actionable).toBe(true);
  });
});

describe("predictDrugResponseV2", () => {
  it("poor代谢+华法林 → 减量", () => {
    expect(predictDrugResponseV2({ cyp2c9: "poor", vkorc1: "low" }, "华法林").doseAdjust).toBe(true);
  });
});

describe("buildGenomicPrecisionV2Report", () => {
  it("生成检测数据", () => {
    const r = buildGenomicPrecisionV2Report("30d");
    expect(r.testing.newborn).toBeGreaterThan(0);
  });

  it("生成药物基因组数据", () => {
    const r = buildGenomicPrecisionV2Report("30d");
    expect(r.pharmacogenomics.warfarin).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGenomicPrecisionV2Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
