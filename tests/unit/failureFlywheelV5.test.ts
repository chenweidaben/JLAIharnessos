/**
 * 健澜科技 jlmedaios - 失败案例回灌学习飞轮 V5 单测（M275-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  backtrackToKnowledgeV5,
  buildFailureFlywheelV5Report,
  extractLessonV5,
  verifyLearningV5,
  type AdverseEvent,
  type FeedbackLoop,
} from "../../src/bff/aggregators/failureFlywheelV5Aggregator";

const medEvent: AdverseEvent = { id: "e1", eventType: "用药错误", caseRef: "c1", description: "患者", severity: "moderate" };

describe("extractLessonV5", () => {
  it("用药错误→根因为用药核对疏漏", () => {
    expect(extractLessonV5(medEvent).rootCause).toBe("用药核对疏漏");
  });
  it("跌倒事件→风险评估不足", () => {
    expect(extractLessonV5({ ...medEvent, eventType: "跌倒" }).rootCause).toBe("风险评估不足");
  });
});

describe("backtrackToKnowledgeV5", () => {
  it("生成知识条目与规则ID", () => {
    const kb = backtrackToKnowledgeV5(extractLessonV5(medEvent));
    expect(kb.knowledgeArtifact).toContain("【知识条目】");
    expect(kb.ruleId).toContain("rule-");
  });
});

describe("verifyLearningV5", () => {
  it("有验证人且actionItem非空→通过", () => {
    const loop: FeedbackLoop = {
      eventType: "用药错误", caseRef: "c1", rootCause: "x", actionItem: "y",
      knowledgeArtifact: "", ruleId: "r1", verifiedBy: "", verified: false,
    };
    expect(verifyLearningV5(loop, "张主任").passed).toBe(true);
  });
});

describe("buildFailureFlywheelV5Report", () => {
  it("按类型统计并算验证率", () => {
    const loops: FeedbackLoop[] = [
      { eventType: "用药错误", caseRef: "c1", rootCause: "x", actionItem: "y", knowledgeArtifact: "", ruleId: "r1", verifiedBy: "z", verified: true },
      { eventType: "跌倒", caseRef: "c2", rootCause: "x", actionItem: "y", knowledgeArtifact: "", ruleId: "r2", verifiedBy: "", verified: false },
    ];
    const r = buildFailureFlywheelV5Report(loops);
    expect(r.verifiedRate).toBe(50);
    expect(r.pendingCount).toBe(1);
  });
});
