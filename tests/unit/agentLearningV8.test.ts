/**
 * 健澜科技 jlmedaios - Agent 反馈与经验沉淀 V8 单测（M291-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  adjustAgentWeightV8,
  buildAgentLearningSummaryV8,
  recordAgentFeedbackV8,
  type AgentFeedbackEvent,
} from "../../src/bff/aggregators/agentLearningV8Aggregator";
import { agentLearningV8Routes } from "../../src/bff/routes/agentLearningV8";

describe("recordAgentFeedbackV8", () => {
  it("追加到 history，返回新数组，原数组不变", () => {
    const history: AgentFeedbackEvent[] = [
      { role: "doctor", eventType: "adopt", createdAt: 1 },
    ];
    const next = recordAgentFeedbackV8({ role: "doctor", eventType: "reject", createdAt: 2 }, history);
    expect(next.length).toBe(2);
    expect(history.length).toBe(1); // 原数组未改
  });
});

describe("adjustAgentWeightV8", () => {
  it("2次adopt，初始0.9 → 0.9+2*0.05=1.0", () => {
    const history: AgentFeedbackEvent[] = [
      { role: "doctor", eventType: "adopt", createdAt: 1 },
      { role: "doctor", eventType: "adopt", createdAt: 2 },
    ];
    expect(adjustAgentWeightV8(history, "adopt", 0.9)).toBe(1.0);
  });
  it("3次reject，初始0.5 → 0.5-3*0.03=0.41", () => {
    const history: AgentFeedbackEvent[] = [
      { role: "nurse", eventType: "reject", createdAt: 1 },
      { role: "nurse", eventType: "reject", createdAt: 2 },
      { role: "nurse", eventType: "reject", createdAt: 3 },
    ];
    expect(adjustAgentWeightV8(history, "reject", 0.5)).toBe(0.41);
  });
  it("clamp 下限 0.1", () => {
    const history: AgentFeedbackEvent[] = [
      { role: "pharma", eventType: "reject", createdAt: 1 },
      { role: "pharma", eventType: "reject", createdAt: 2 },
      { role: "pharma", eventType: "reject", createdAt: 3 },
      { role: "pharma", eventType: "reject", createdAt: 4 },
      { role: "pharma", eventType: "reject", createdAt: 5 },
    ];
    // 0.15 - 5*0.03 = 0.00 → clamp 到 0.1
    expect(adjustAgentWeightV8(history, "reject", 0.15)).toBe(0.1);
  });
});

describe("buildAgentLearningSummaryV8", () => {
  it("4事件：2adopt+1correct+1reject → adoptRate=50% correctRate=25%", () => {
    const history: AgentFeedbackEvent[] = [
      { role: "doctor", eventType: "adopt", createdAt: 1 },
      { role: "doctor", eventType: "adopt", createdAt: 2 },
      { role: "doctor", eventType: "correct", createdAt: 3 },
      { role: "doctor", eventType: "reject", createdAt: 4 },
    ];
    const r = buildAgentLearningSummaryV8(history);
    expect(r.totalEvents).toBe(4);
    expect(r.adoptRatePct).toBe(50);
    expect(r.correctRatePct).toBe(25);
  });
  it("空态→全部为0", () => {
    const r = buildAgentLearningSummaryV8([]);
    expect(r.totalEvents).toBe(0);
    expect(r.adoptRatePct).toBe(0);
  });
});

describe("agentLearningV8Routes 写权限", () => {
  it("POST /api/v1/agent/feedback 路由存在且 auth:true", () => {
    const post = agentLearningV8Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/feedback");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
