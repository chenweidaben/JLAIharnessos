/**
 * 健澜科技 jlmedaios - 供应链 V3 纯函数单测（M246-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSupplyChainV3Report,
  optimizeInventoryV3,
  traceUDIV3,
} from "../../src/bff/aggregators/supplyChainV3ReportAggregator";

describe("optimizeInventoryV3", () => {
  it("需求100提前期7天 → 再订货点840", () => {
    expect(optimizeInventoryV3(100, 7).reorderPoint).toBe(840);
  });
});

describe("traceUDIV3", () => {
  it("有代码有批次 → 有效", () => {
    expect(traceUDIV3({ code: "UDI123", batch: "B001", expiry: "2027-01-01" }).valid).toBe(true);
  });
});

describe("buildSupplyChainV3Report", () => {
  it("生成 SPD 数据", () => {
    const r = buildSupplyChainV3Report("30d");
    expect(r.spd.items).toBeGreaterThan(0);
  });

  it("生成供应商数据", () => {
    const r = buildSupplyChainV3Report("30d");
    expect(r.vendors.total).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSupplyChainV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
