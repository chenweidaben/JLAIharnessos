/**
 * 健澜科技 jlmedaios - 被服洗涤与织物管理 V5 单测（M279-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLinenManagementV5Report,
  optimizeLinenStockV5,
  planLinenWashV5,
  trackLinenLossV5,
  type LinenItem,
} from "../../src/bff/aggregators/linenManagementV5Aggregator";

describe("planLinenWashV5", () => {
  it("库存80常备100→需洗20", () => {
    expect(planLinenWashV5(30, 100, 80).washNow).toBe(30);
  });
  it("库存120常备100→无需洗涤", () => {
    expect(planLinenWashV5(30, 100, 120).washNow).toBe(0);
  });
});

describe("trackLinenLossV5", () => {
  it("丢失5发放200→损耗率约2.4%", () => {
    const items: LinenItem[] = [
      { itemType: "病号服", ward: "w", stock: 80, issued: 200, washing: 30, lost: 5, parLevel: 100 },
    ];
    expect(trackLinenLossV5(items).lossRate).toBe(2.4);
  });
});

describe("optimizeLinenStockV5", () => {
  it("库存40常备100的0.5→critical", () => {
    const item: LinenItem = { itemType: "x", ward: "w", stock: 40, issued: 0, washing: 0, lost: 0, parLevel: 100 };
    expect(optimizeLinenStockV5(item).status).toBe("critical");
  });
  it("库存120常备100→healthy", () => {
    const item: LinenItem = { itemType: "x", ward: "w", stock: 120, issued: 0, washing: 0, lost: 0, parLevel: 100 };
    expect(optimizeLinenStockV5(item).status).toBe("healthy");
  });
});

describe("buildLinenManagementV5Report", () => {
  it("统计品类与损耗", () => {
    const items: LinenItem[] = [
      { itemType: "病号服", ward: "w", stock: 80, issued: 200, washing: 30, lost: 5, parLevel: 100 },
      { itemType: "床单", ward: "w", stock: 50, issued: 300, washing: 40, lost: 20, parLevel: 150 },
    ];
    const r = buildLinenManagementV5Report(items);
    expect(r.totalItems).toBe(2);
    expect(r.totalLost).toBe(25);
  });
});
