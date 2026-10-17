/**
 * 健澜科技 jlmedaios - 经验复用效果度量 V13 单测（M295-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReuseROIV13,
  computeErrorReductionV13,
  measureReuseEffectV13,
  type AdoptionLogV13,
  type PushLogV13,
} from "../../src/bff/aggregators/reuseRoiV13Aggregator";
import { reuseRoiV13Routes } from "../../src/bff/routes/reuseRoiV13";

const pushLog: PushLogV13[] = [
  { pushId: "p-1", experienceId: "e-1" },
  { pushId: "p-2", experienceId: "e-2" },
  { pushId: "p-3", experienceId: "e-3" },
  { pushId: "p-4", experienceId: "e-4" },
];

const adoptionLog: AdoptionLogV13[] = [
  { pushId: "p-1", adopted: true },
  { pushId: "p-2", adopted: true },
  { pushId: "p-3", adopted: true },
  { pushId: "p-4", adopted: false },
];

describe("measureReuseEffectV13", () => {
  it("4推送/3采纳 → adoptionRate=75.0", () => {
    const e = measureReuseEffectV13(pushLog, adoptionLog);
    expect(e.pushedCount).toBe(4);
    expect(e.adoptedCount).toBe(3);
    expect(e.adoptionRate).toBe(75);
  });
  it("空态→pushed=0/rate=0", () => {
    const e = measureReuseEffectV13([], []);
    expect(e.pushedCount).toBe(0);
    expect(e.adoptionRate).toBe(0);
  });
});

describe("computeErrorReductionV13", () => {
  it("before=10 after=3 → 7（改善7个百分点）", () => {
    expect(computeErrorReductionV13(10, 3)).toBe(7);
  });
});

describe("buildReuseROIV13", () => {
  it("rate=75 且 reduction=7 → high", () => {
    const e = measureReuseEffectV13(pushLog, adoptionLog);
    const roi = buildReuseROIV13(e, 7);
    expect(roi.valueRating).toBe("high");
    expect(roi.adoptionRate).toBe(75);
  });
  it("rate=45 且 reduction=3 → mid", () => {
    const roi = buildReuseROIV13({ pushedCount: 10, adoptedCount: 4, adoptionRate: 40 }, 3);
    expect(roi.valueRating).toBe("mid");
  });
});

describe("reuseRoiV13Routes 读路由", () => {
  it("GET /api/v1/reuse-roi 路由存在且 auth:true", () => {
    const route = reuseRoiV13Routes.find((r) => r.method === "GET" && r.path === "/api/v1/reuse-roi");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
