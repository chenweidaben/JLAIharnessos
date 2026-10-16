/**
 * 健澜科技 jlmedaios - 成本核算 V4 纯函数单测（M250-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  allocateCostsV4,
  buildCostAccountingV4Report,
  calculateDRGCostV4,
} from "../../src/bff/aggregators/costAccountingV4ReportAggregator";

describe("allocateCostsV4", () => {
  it("按临床医技基础分摊", () => {
    expect(allocateCostsV4({ admin: 1000, logistics: 500 }, { clinical: 60, medTech: 40 }).clinical).toBeGreaterThan(0);
  });
});

describe("calculateDRGCostV4", () => {
  it("DRG实际7500标准8000 → 差异-500", () => {
    expect(calculateDRGCostV4({ weight: 1.5, standard: 8000 }, { actual: 7500 }).variance).toBe(-500);
  });
});

describe("buildCostAccountingV4Report", () => {
  it("生成科室数据", () => {
    const r = buildCostAccountingV4Report("30d");
    expect(r.department.full).toBeGreaterThan(0);
  });

  it("生成 DRG 数据", () => {
    const r = buildCostAccountingV4Report("30d");
    expect(r.drg.standard).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCostAccountingV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
