/**
 * 健澜科技 jlmedaios - 药师 Personal Agent（Pharma MUSE）工作台 V8 单测（M290-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPharmaDigestV8,
  buildPharmaTodoV8,
  prioritizePharmaV8,
  type PharmaInteractionAlert,
  type PharmaReviewItem,
  type PharmaStockItem,
} from "../../src/bff/aggregators/agentPharmaV8Aggregator";
import { agentPharmaV8Routes } from "../../src/bff/routes/agentPharmaV8";

const queue: PharmaReviewItem[] = [
  { reviewId: "rv-1", prescriptionId: "rx-1" },
  { reviewId: "rv-2", prescriptionId: "rx-2" },
];

const stock: PharmaStockItem[] = [
  { drugCode: "WARFARIN", onHand: 20, threshold: 100 },
];

const alerts: PharmaInteractionAlert[] = [
  { alertId: "ia-1", drugA: "WARFARIN", drugB: "ASPIRIN", severity: "high" },
];

describe("buildPharmaTodoV8", () => {
  it("合并 2点评 + 1低库存 + 1警报 → 4 条待办", () => {
    const todos = buildPharmaTodoV8(queue, stock, alerts);
    expect(todos.length).toBe(4);
  });
  it("低库存 onHand=20<threshold/2=50 → severity=high", () => {
    const todos = buildPharmaTodoV8(queue, stock, alerts);
    const low = todos.find((t) => t.type === "lowStock");
    expect(low?.severity).toBe("high");
  });
});

describe("prioritizePharmaV8", () => {
  it("interactionAlert > reviewQueue > lowStock", () => {
    const todos = buildPharmaTodoV8(queue, stock, alerts);
    const r = prioritizePharmaV8(todos);
    expect(r[0].type).toBe("interactionAlert");
    expect(r[3].type).toBe("lowStock");
  });
});

describe("buildPharmaDigestV8", () => {
  it("queue=2 stock=1 alert=1 highAlert=1", () => {
    const d = buildPharmaDigestV8(queue, stock, alerts);
    expect(d.queueCount).toBe(2);
    expect(d.stockCount).toBe(1);
    expect(d.alertCount).toBe(1);
    expect(d.highAlertCount).toBe(1);
  });
  it("空态→全部为0", () => {
    const d = buildPharmaDigestV8([], [], []);
    expect(d.queueCount).toBe(0);
    expect(d.alertCount).toBe(0);
  });
});

describe("agentPharmaV8Routes 写权限", () => {
  it("POST /api/v1/agent/pharma/todo/complete 路由存在且 auth:true", () => {
    const post = agentPharmaV8Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/pharma/todo/complete");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
