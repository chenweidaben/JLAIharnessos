/**
 * 健澜科技 jlmedaios - 推送效果与闭环总览 V13 单测（M302-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPushEffectOverviewV13,
  computePushROIV13,
  identifyPushGapV13,
  type PushLogV13,
} from "../../src/bff/aggregators/pushEffectOverviewV13Aggregator";
import { pushEffectOverviewV13Routes } from "../../src/bff/routes/pushEffectOverviewV13";

const logs: PushLogV13[] = [
  { pushId: "p-1", clicked: true, adopted: true },
  { pushId: "p-2", clicked: true, adopted: true },
  { pushId: "p-3", clicked: true, adopted: false },
  { pushId: "p-4", clicked: false, adopted: false },
  { pushId: "p-5", clicked: false, adopted: false },
  { pushId: "p-6", clicked: false, adopted: false },
  { pushId: "p-7", clicked: false, adopted: false },
  { pushId: "p-8", clicked: false, adopted: false },
  { pushId: "p-9", clicked: false, adopted: false },
  { pushId: "p-10", clicked: false, adopted: false },
];

describe("buildPushEffectOverviewV13", () => {
  it("10曝光/3点击/2采纳 → CTR=30% 采纳率=20%", () => {
    const o = buildPushEffectOverviewV13(logs);
    expect(o.impressions).toBe(10);
    expect(o.clicks).toBe(3);
    expect(o.adoptions).toBe(2);
    expect(o.ctr).toBe(30);
    expect(o.adoptionRate).toBe(20);
  });
  it("空态 → 全0", () => {
    const o = buildPushEffectOverviewV13([]);
    expect(o.impressions).toBe(0);
  });
});

describe("computePushROIV13", () => {
  it("10曝光节省5人时 → 5/(10/1000)=500 人时/千次", () => {
    expect(computePushROIV13(2, 5, 10)).toBe(500);
  });
  it("0曝光 → 0", () => {
    expect(computePushROIV13(0, 0, 0)).toBe(0);
  });
});

describe("identifyPushGapV13", () => {
  it("CTR=30 采纳率=20 → 无缺口", () => {
    const o = buildPushEffectOverviewV13(logs);
    expect(identifyPushGapV13(o)).toBe("");
  });
  it("CTR=5<10 → '推送不精准'", () => {
    const o = { impressions: 100, clicks: 5, adoptions: 20, ctr: 5, adoptionRate: 20 };
    expect(identifyPushGapV13(o)).toContain("推送不精准");
  });
  it("采纳率=10<20 → '推送内容无效'", () => {
    const o = { impressions: 100, clicks: 50, adoptions: 10, ctr: 50, adoptionRate: 10 };
    expect(identifyPushGapV13(o)).toContain("推送内容无效");
  });
});

describe("pushEffectOverviewV13Routes 读路由", () => {
  it("GET /api/v1/push-effect-overview 路由存在且 auth:true", () => {
    const route = pushEffectOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/push-effect-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
