/**
 * 健澜科技 jlmedaios - 推送时机与场景触发 V13 单测（M302-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPushSceneV13,
  evaluatePushTimingV13,
  filterSceneEligibleV13,
  type PushSceneExpV13,
} from "../../src/bff/aggregators/pushSceneV13Aggregator";
import { pushSceneV13Routes } from "../../src/bff/routes/pushSceneV13";

const candidates: PushSceneExpV13[] = [
  { experienceId: "e-1", title: "房颤华法林" },
  { experienceId: "e-2", title: "术后低体温" },
];

describe("evaluatePushTimingV13", () => {
  it("order_write=90 / open_chart=70 / handover=50 / idle=10", () => {
    expect(evaluatePushTimingV13("order_write")).toBe(90);
    expect(evaluatePushTimingV13("open_chart")).toBe(70);
    expect(evaluatePushTimingV13("handover")).toBe(50);
    expect(evaluatePushTimingV13("idle")).toBe(10);
  });
});

describe("filterSceneEligibleV13", () => {
  it("70 ≥ 60 → true", () => {
    expect(filterSceneEligibleV13(70)).toBe(true);
  });
  it("50 < 60 → false", () => {
    expect(filterSceneEligibleV13(50)).toBe(false);
  });
});

describe("buildPushSceneV13", () => {
  it("order_write → 标签=下医嘱 + 触发时机", () => {
    const pkg = buildPushSceneV13("order_write", candidates);
    expect(pkg.sceneLabel).toBe("下医嘱");
    expect(pkg.triggerTiming).toContain("医嘱");
    expect(pkg.pushList.length).toBe(2);
  });
  it("空态 → pushList=0", () => {
    const pkg = buildPushSceneV13("idle", []);
    expect(pkg.pushList.length).toBe(0);
  });
});

describe("pushSceneV13Routes 读路由", () => {
  it("GET /api/v1/push-scene 路由存在且 auth:true", () => {
    const route = pushSceneV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/push-scene",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
