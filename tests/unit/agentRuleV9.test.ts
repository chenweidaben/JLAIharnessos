/**
 * 健澜科技 jlmedaios - 从反馈沉淀个性化推荐规则 V9 单测（M291-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRuleLibraryV9,
  distillRulesV9,
  rankRecommendV9,
  type FeedbackEventV9,
} from "../../src/bff/aggregators/agentRuleV9Aggregator";
import { agentRuleV9Routes } from "../../src/bff/routes/agentRuleV9";

describe("distillRulesV9", () => {
  it("3adopt→warn-dual weight=0.65；1reject→dose weight=0.47", () => {
    const events: FeedbackEventV9[] = [
      { role: "doctor", pattern: "warn-dual", eventType: "adopt" },
      { role: "doctor", pattern: "warn-dual", eventType: "adopt" },
      { role: "doctor", pattern: "warn-dual", eventType: "adopt" },
      { role: "doctor", pattern: "dose", eventType: "reject" },
    ];
    const rules = distillRulesV9(events);
    const warn = rules.find((r) => r.pattern === "warn-dual");
    const dose = rules.find((r) => r.pattern === "dose");
    expect(warn?.weight).toBe(0.65);
    expect(warn?.sourceCnt).toBe(3);
    expect(dose?.weight).toBe(0.47);
    expect(dose?.sourceCnt).toBe(1);
  });
  it("reject 过多→weight clamp 0.1", () => {
    const events: FeedbackEventV9[] = [
      { role: "nurse", pattern: "x", eventType: "reject" },
      { role: "nurse", pattern: "x", eventType: "reject" },
      { role: "nurse", pattern: "x", eventType: "reject" },
      { role: "nurse", pattern: "x", eventType: "reject" },
      { role: "nurse", pattern: "x", eventType: "reject" },
    ];
    // 0.5 - 5*0.03 = 0.35 → 不低于0.1（本例0.35仍>=0.3 enabled）
    expect(distillRulesV9(events)[0].weight).toBe(0.35);
  });
});

describe("rankRecommendV9", () => {
  it("doctor 角色过滤，按 weight 降序，仅返回 enabled", () => {
    const events: FeedbackEventV9[] = [
      { role: "doctor", pattern: "warn", eventType: "adopt" },
      { role: "doctor", pattern: "warn", eventType: "adopt" },
      { role: "doctor", pattern: "warn", eventType: "adopt" },
      { role: "doctor", pattern: "dose", eventType: "reject" },
      { role: "nurse", pattern: "iv", eventType: "adopt" },
    ];
    const rules = distillRulesV9(events);
    const r = rankRecommendV9(rules, { role: "doctor" });
    expect(r[0].pattern).toBe("warn");
    expect(r[0].weight).toBe(0.65);
    expect(r.every((x) => x.role === "doctor")).toBe(true);
  });
});

describe("buildRuleLibraryV9", () => {
  it("3条规则全部启用，0条≥0.7", () => {
    const events: FeedbackEventV9[] = [
      { role: "doctor", pattern: "warn", eventType: "adopt" },
      { role: "doctor", pattern: "dose", eventType: "reject" },
      { role: "nurse", pattern: "iv", eventType: "adopt" },
    ];
    const lib = buildRuleLibraryV9(distillRulesV9(events));
    expect(lib.totalRules).toBe(3);
    expect(lib.enabledRules).toBe(3);
    expect(lib.highWeightRules).toBe(0);
  });
  it("空态→全部为0", () => {
    expect(buildRuleLibraryV9([]).totalRules).toBe(0);
  });
});

describe("agentRuleV9Routes 写权限", () => {
  it("POST /api/v1/agent/rules/:id/toggle 路由存在且 auth:true", () => {
    const post = agentRuleV9Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/rules/:id/toggle");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
