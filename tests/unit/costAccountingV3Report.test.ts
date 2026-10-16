/**
 * 健澜科技 jlmedaios - 成本核算 V3 纯函数单测（M240-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  allocateCosts,
  buildCostAccountingV3Report,
  calculateDRGCost,
} from "../../src/bff/aggregators/costAccountingV3ReportAggregator";

describe("allocateCosts", () => {
  it("100万按60/40分摊 → 60万/40万", () => {
    const r = allocateCosts(1000000, [{ dept: "内科", share: 0.6 }, { dept: "外科", share: 0.4 }]);
    expect(r[0].amount).toBe(600000);
    expect(r[1].amount).toBe(400000);
  });
});

describe("calculateDRGCost", () => {
  it(" labor30万+material20万+overhead10万 → 60万", () => {
    expect(calculateDRGCost("DRG1", { labor: 300000, material: 200000, overhead: 100000 }).total).toBe(600000);
  });
});

describe("buildCostAccountingV3Report", () => {
  it("生成科室数据", () => {
    const r = buildCostAccountingV3Report("30d");
    expect(r.dept.fullCost).toBeGreaterThan(0);
  });

  it("生成DRG数据", () => {
    const r = buildCostAccountingV3Report("30d");
    expect(r.drg.cases).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCostAccountingV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
