/**
 * 健澜科技 jlmedaios - 药品供应链 V3 纯函数单测（M256-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDrugSupplyChainV3Report,
  optimizeDrugInventoryV3,
  traceDrugV3,
} from "../../src/bff/aggregators/drugSupplyChainV3ReportAggregator";

describe("optimizeDrugInventoryV3", () => {
  it("日需求100采购周期7 → 安全库存300再订货点1000", () => {
    expect(optimizeDrugInventoryV3({ daily: 100 }, 7).reorderPoint).toBe(1000);
  });
});

describe("traceDrugV3", () => {
  it("追溯码1234567890 → 有效", () => {
    expect(traceDrugV3("1234567890").valid).toBe(true);
  });
});

describe("buildDrugSupplyChainV3Report", () => {
  it("生成采购数据", () => {
    const r = buildDrugSupplyChainV3Report("30d");
    expect(r.procurement.plan).toBeGreaterThan(0);
  });

  it("生成库存数据", () => {
    const r = buildDrugSupplyChainV3Report("30d");
    expect(r.inventory.turnover).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDrugSupplyChainV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
