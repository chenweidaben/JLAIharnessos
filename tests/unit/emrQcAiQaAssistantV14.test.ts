/**
 * 健澜科技 jlmedaios - 质控 AI 智能问答助手 V14 单测（M508-D，M508 收官）
 *
 * 测试 askQuestion 问答、buildQaReport 报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  askQuestion,
  buildQaReport,
  type AiQaAssistantV14,
} from "../../src/bff/aggregators/emrQcAiQaAssistantV14Aggregator";
import { emrQcAiQaAssistantV14Routes } from "../../src/bff/routes/emrQcAiQaAssistantV14";
import type { RouteDef } from "../../src/bff/types";

describe("askQuestion 病历签名要求", () => {
  // 手算：question='病历签名要求' → 关键词'签名'匹配 → answer 包含签名相关内容, confidence>=80
  it("question='病历签名要求' → answer 包含签名相关内容, confidence>=80", () => {
    const result = askQuestion("病历签名要求");
    expect(result.answer).toContain("签名");
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });
});

describe("askQuestion 缺陷分级标准", () => {
  // 手算：question='缺陷分级标准' → 关键词'缺陷'匹配 → answer 包含缺陷分级内容
  it("question='缺陷分级标准' → answer 包含缺陷分级内容", () => {
    const result = askQuestion("缺陷分级标准");
    expect(result.answer).toContain("缺陷");
  });
});

describe("buildQaReport 测试答案", () => {
  // 手算：{answer:'测试答案', confidence=90} → 正确构建
  it("{answer:'测试答案', confidence=90} → 正确构建", () => {
    const result: AiQaAssistantV14 = { answer: "测试答案", confidence: 90 };
    const report = buildQaReport("测试问题", result);
    expect(report.question).toBe("测试问题");
    expect(report.answer).toBe("测试答案");
    expect(report.confidence).toBe(90);
  });
});

describe("askQuestion 质控流程", () => {
  // 手算：question='质控流程' → 关键词'流程'或'质控'匹配 → answer 非空
  it("question='质控流程' → answer 非空", () => {
    const result = askQuestion("质控流程");
    expect(result.answer.length).toBeGreaterThan(0);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-ai-qa-assistant auth:true", () => {
    const def = (emrQcAiQaAssistantV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-ai-qa-assistant");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
