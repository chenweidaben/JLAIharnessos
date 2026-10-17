/**
 * 健澜科技 jlmedaios - 跨科室扩散总览 V13 单测（M304-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDiffusionOverviewV13,
  computeDiffusionMaturityV13,
  identifyDiffusionGapV13,
  type DiffusionOverviewInputV13,
} from "../../src/bff/aggregators/diffusionOverviewV13Aggregator";
import { diffusionOverviewV13Routes } from "../../src/bff/routes/diffusionOverviewV13";

const input: DiffusionOverviewInputV13 = {
  totalBroadcasts: 5,
  totalAdoptions: 3,
  totalActions: 4,
  totalDepts: 5,
  influencerDepts: 2,
  isolatedDepts: 1,
};

describe("buildDiffusionOverviewV13", () => {
  // 算式：3 adopted / 4 total = 0.75 → 75%
  it("总览：broadcasts=5 adoptions=3 rate=75 influencer=2 isolated=1", () => {
    const o = buildDiffusionOverviewV13(input);
    expect(o.totalBroadcasts).toBe(5);
    expect(o.totalAdoptions).toBe(3);
    expect(o.adoptionRate).toBe(75);
    expect(o.influencerDepts).toBe(2);
    expect(o.isolatedDepts).toBe(1);
  });
  it("空态 → 全0", () => {
    const o = buildDiffusionOverviewV13({
      totalBroadcasts: 0, totalAdoptions: 0, totalActions: 0,
      totalDepts: 0, influencerDepts: 0, isolatedDepts: 0,
    });
    expect(o.totalBroadcasts).toBe(0);
  });
});

describe("computeDiffusionMaturityV13", () => {
  // 算式：broadcastRatio=min(100,5×20)=100; connectedRatio=(5-1)/5×100=80
  // maturity = 100×0.3 + 75×0.4 + 80×0.3 = 30 + 30 + 24 = 84
  it("成熟度 = 84", () => {
    const o = buildDiffusionOverviewV13(input);
    expect(computeDiffusionMaturityV13(o, 5)).toBe(84);
  });
});

describe("identifyDiffusionGapV13", () => {
  // 算式：adoptionRate=75≥50, isolated=1≤2 → 无缺口
  it("无缺口", () => {
    const o = buildDiffusionOverviewV13(input);
    expect(identifyDiffusionGapV13(o)).toBe("");
  });
  // 算式：isolated=3>2 → 知识孤岛
  it("isolated=3>2 → '仍有科室处于知识孤岛'", () => {
    const o = { totalBroadcasts: 5, totalAdoptions: 3, adoptionRate: 75, influencerDepts: 2, isolatedDepts: 3 };
    expect(identifyDiffusionGapV13(o)).toContain("知识孤岛");
  });
  // 算式：adoptionRate=40<50 → 采纳不足
  it("adoptionRate=40<50 → '扩散后采纳不足'", () => {
    const o = { totalBroadcasts: 5, totalAdoptions: 2, adoptionRate: 40, influencerDepts: 2, isolatedDepts: 1 };
    expect(identifyDiffusionGapV13(o)).toContain("采纳不足");
  });
});

describe("diffusionOverviewV13Routes 读路由", () => {
  it("GET /api/v1/diffusion-overview 路由存在且 auth:true", () => {
    const route = diffusionOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/diffusion-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
