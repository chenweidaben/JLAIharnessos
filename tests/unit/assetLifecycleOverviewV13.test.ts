/**
 * 健澜科技 jlmedaios - 经验资产生命周期总览 V13 单测（M305-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAssetLifecycleOverviewV13,
  computeAssetHealthV13,
  identifyAssetGapV13,
  type AssetLifecycleInputV13,
} from "../../src/bff/aggregators/assetLifecycleOverviewV13Aggregator";
import { assetLifecycleOverviewV13Routes } from "../../src/bff/routes/assetLifecycleOverviewV13";

const input: AssetLifecycleInputV13 = {
  activeCount: 80,
  staleCount: 5,
  retiredCount: 10,
  archivedCount: 5,
  highValueActiveCount: 60,
};

describe("buildAssetLifecycleOverviewV13", () => {
  // 算式：total=80+5+10+5=100; avg=(60×80 + 20×40)/100 = (4800+800)/100 = 56
  it("总览：active=80 stale=5 retired=10 archived=5 avg=56", () => {
    const o = buildAssetLifecycleOverviewV13(input);
    expect(o.activeCount).toBe(80);
    expect(o.staleCount).toBe(5);
    expect(o.retiredCount).toBe(10);
    expect(o.archivedCount).toBe(5);
    expect(o.avgAssetValue).toBe(56);
  });
  it("空态 → 全0", () => {
    const o = buildAssetLifecycleOverviewV13({
      activeCount: 0, staleCount: 0, retiredCount: 0, archivedCount: 0, highValueActiveCount: 0,
    });
    expect(o.activeCount).toBe(0);
  });
});

describe("computeAssetHealthV13", () => {
  // 算式：activeRatio=80, highValueRatio=60, archivedRatio=5
  // health = 80×0.5 + 60×0.3 + 5×0.2 = 40 + 18 + 1 = 59
  it("健康分 = 59", () => {
    const o = buildAssetLifecycleOverviewV13(input);
    expect(computeAssetHealthV13(o, input)).toBe(59);
  });
});

describe("identifyAssetGapV13", () => {
  // 算式：stale=5≤10, archived=5≤20 → 无缺口
  it("无缺口", () => {
    const o = buildAssetLifecycleOverviewV13(input);
    expect(identifyAssetGapV13(o)).toBe("");
  });
  // 算式：stale=15>10 → 僵尸经验堆积
  it("stale=15>10 → '僵尸经验堆积'", () => {
    const o = { activeCount: 80, staleCount: 15, retiredCount: 10, archivedCount: 5, avgAssetValue: 56 };
    expect(identifyAssetGapV13(o)).toContain("僵尸经验堆积");
  });
  // 算式：archived=25>20 → 归档库过大
  it("archived=25>20 → '归档库过大需复盘'", () => {
    const o = { activeCount: 80, staleCount: 5, retiredCount: 10, archivedCount: 25, avgAssetValue: 56 };
    expect(identifyAssetGapV13(o)).toContain("归档库过大");
  });
});

describe("assetLifecycleOverviewV13Routes 读路由", () => {
  it("GET /api/v1/asset-lifecycle-overview 路由存在且 auth:true", () => {
    const route = assetLifecycleOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/asset-lifecycle-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
