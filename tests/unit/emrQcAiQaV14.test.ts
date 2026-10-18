/**
 * 健澜科技 jlmedaios - 质控 AI 知识问答 V14 单测（M499-D）
 *
 * 测试 answerQuestion 问答、buildQaReport 构建报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  answerQuestion,
  buildQaReport,
  type QaReportV14,
  type QaResultV14,
} from "../../src/bff/aggregators/emrQcAiQaV14Aggregator";
import { emrQcAiQaV14Routes } from "../../src/bff/routes/emrQcAiQaV14";
import type { RouteDef } from "../../src/bff/types";

describe("answerQuestion 甲级病历", () => {
  // 手算：question='什么是甲级病历？' → answer 包含'甲级病历'（关键词"甲级病历"匹配）
  it("question='什么是甲级病历？' → answer 包含'甲级病历'", () => {
    const result: QaResultV14 = answerQuestion("什么是甲级病历？");
    expect(result.answer).toContain("甲级病历");
  });
});

describe("answerQuestion 时限要求", () => {
  // 手算：question='病历书写时限要求？' → answer 包含'时限'（关键词"时限"匹配）
  it("question='病历书写时限要求？' → answer 包含'时限'", () => {
    const result: QaResultV14 = answerQuestion("病历书写时限要求？");
    expect(result.answer).toContain("时限");
  });
});

describe("answerQuestion 扣分标准", () => {
  // 手算：question='质控扣分标准？' → answer 包含'扣分'（关键词"扣分"匹配）
  it("question='质控扣分标准？' → answer 包含'扣分'", () => {
    const result: QaResultV14 = answerQuestion("质控扣分标准？");
    expect(result.answer).toContain("扣分");
  });
});

describe("buildQaReport 正确构建", () => {
  // 手算：{answer:'甲级病历评分≥90分', source:'病历书写规范'} → 正确构建
  it("{answer:'甲级病历评分≥90分', source:'病历书写规范'} → 正确构建", () => {
    const report: QaReportV14 = buildQaReport(
      { answer: "甲级病历评分≥90分", source: "病历书写规范" },
      "什么是甲级病历？",
    );
    expect(report.question).toBe("什么是甲级病历？");
    expect(report.answer).toBe("甲级病历评分≥90分");
    expect(report.source).toBe("病历书写规范");
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-ai-qa auth:true", () => {
    const def = (emrQcAiQaV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-ai-qa");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
