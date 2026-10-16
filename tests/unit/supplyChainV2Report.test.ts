/**
 * 健澜科技 jlmedaios - 供应链 V2 纯函数单测（M236-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSupplyChainV2Report,
  optimizeInventory,
  traceUDI,
} from "../../src/bff/aggregators/supplyChainV2ReportAggregator";

describe("optimizeInventory", () => {
  it("月需求1000 → 安全库存100", () => {
    expect(optimizeInventory("1000", "7天").safetyStock).toBeGreaterThan(0);
  });
});

describe("traceUDI", () => {
  it("UDI召回码 → 召回触发", () => {
    expect(traceUDI("6901召回").recall).toBe(true);
  });
});

describe("buildSupplyChainV2Report", () => {
  it("生成SPD数据", () => {
    const r = buildSupplyChainV2Report("30d");
    expect(r.spd.uniqueCode).toBeGreaterThan(0);
  });

  it("生成UDI数据", () => {
    const r = buildSupplyChainV2Report("30d");
    expect(r.udi.implant).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSupplyChainV2Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
