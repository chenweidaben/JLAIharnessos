/**
 * 健澜科技 jlmedaios - PHARMA_MUSE 主动式晨会简报 V11 单测（M293-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPharmaBriefV11,
  formatPharmaBriefV11,
  prioritizePharmaBriefV11,
  type InteractionAlertV11,
  type InterceptV11,
  type LowStockV11,
  type PharmaWeightDeltaV11,
  type ReviewItemV11,
} from "../../src/bff/aggregators/pharmaBriefV11Aggregator";
import { pharmaBriefV11Routes } from "../../src/bff/routes/pharmaBriefV11";

const reviewQueue: ReviewItemV11[] = [
  { reviewId: "rv-1", prescriptionId: "rx-1" },
  { reviewId: "rv-2", prescriptionId: "rx-2" },
];

const lowStock: LowStockV11[] = [
  { drugCode: "W", onHand: 20, threshold: 100 },
];

const alerts: InteractionAlertV11[] = [
  { alertId: "ia-1", drugA: "W", drugB: "A" },
];

const intercepts: InterceptV11[] = [
  { ruleId: "r-1", count: 5 },
  { ruleId: "r-2", count: 3 },
];

const weightDeltas: PharmaWeightDeltaV11[] = [
  { ruleId: "r-1", delta: 0.05 },
];

describe("buildPharmaBriefV11", () => {
  it("聚合 1+2+1+2+1=7 条，interceptTotal=8", () => {
    const b = buildPharmaBriefV11("ph-001", reviewQueue, lowStock, alerts, intercepts, weightDeltas);
    expect(b.items.length).toBe(7);
    expect(b.reviewCount).toBe(2);
    expect(b.lowStockCount).toBe(1);
    expect(b.interactionAlertCount).toBe(1);
    expect(b.interceptTotal).toBe(8);
    expect(b.weightDeltaCount).toBe(1);
  });
  it("空态→全部为0", () => {
    const b = buildPharmaBriefV11("ph-001", [], [], [], [], []);
    expect(b.items.length).toBe(0);
    expect(b.interceptTotal).toBe(0);
  });
});

describe("prioritizePharmaBriefV11", () => {
  it("interactionAlert > reviewQueue > lowStock > intercept > weightDelta", () => {
    const b = buildPharmaBriefV11("ph-001", reviewQueue, lowStock, alerts, intercepts, weightDeltas);
    const r = prioritizePharmaBriefV11(b.items);
    expect(r[0].category).toBe("interactionAlert");
    expect(r[1].category).toBe("reviewQueue");
    expect(r[2].category).toBe("reviewQueue");
    expect(r[3].category).toBe("lowStock");
    expect(r[4].category).toBe("intercept");
    expect(r[5].category).toBe("intercept");
    expect(r[6].category).toBe("weightDelta");
  });
});

describe("formatPharmaBriefV11", () => {
  it("文本含关键数字：1条相互作用/2张处方/1低库存/8次拦截/1权重", () => {
    const b = buildPharmaBriefV11("ph-001", reviewQueue, lowStock, alerts, intercepts, weightDeltas);
    const text = formatPharmaBriefV11(b);
    expect(text).toContain("1条相互作用");
    expect(text).toContain("2张处方");
    expect(text).toContain("1个药品低库存");
    expect(text).toContain("拦截8次");
    expect(text).toContain("1条规则权重");
  });
});

describe("pharmaBriefV11Routes 读路由", () => {
  it("GET /api/v1/pharma-brief 路由存在且 auth:true", () => {
    const route = pharmaBriefV11Routes.find((r) => r.method === "GET" && r.path === "/api/v1/pharma-brief");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
