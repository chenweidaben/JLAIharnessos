/**
 * 健澜科技 jlmedaios - AI 建议全链路审计 V5 单测（M276-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAdviceQualityV5,
  buildAIAdviceTraceV5Report,
  explainAdviceV5,
  recordAdviceV5,
  type AdviceTrace,
} from "../../src/bff/aggregators/aiAdviceTraceV5Aggregator";

const base: Omit<AdviceTrace, "id"> = {
  adviceType: "diagnosis",
  patientRef: "p1",
  inputSnapshot: "胸痛+心电图",
  evidenceRefs: ["guide-2023", "trial-A"],
  confidence: 0.85,
  suggestedAction: "排除心梗",
  adopted: true,
  overrideReviewedBy: "",
  overrideReason: "",
};

describe("recordAdviceV5", () => {
  it("返回带id的审计记录", () => {
    expect(recordAdviceV5(base).id).toContain("advice-");
  });
});

describe("assessAdviceQualityV5", () => {
  it("1条采纳1条override→采纳率50% override率50%", () => {
    const adopted = recordAdviceV5(base);
    const overridden = recordAdviceV5({ ...base, adopted: false, overrideReviewedBy: "张主任", overrideReason: "临床判断" });
    const q = assessAdviceQualityV5([adopted, overridden]);
    expect(q.adoptionRate).toBe(50);
    expect(q.overrideRate).toBe(50);
  });
});

describe("explainAdviceV5", () => {
  it("生成可解释文本并含证据数", () => {
    const e = explainAdviceV5(recordAdviceV5(base));
    expect(e.evidenceCount).toBe(2);
    expect(e.explanation).toContain("guide-2023");
  });
});

describe("buildAIAdviceTraceV5Report", () => {
  it("按类型统计", () => {
    const list = [recordAdviceV5(base), recordAdviceV5({ ...base, adviceType: "treatment" })];
    const r = buildAIAdviceTraceV5Report(list);
    expect(r.byType.diagnosis).toBe(1);
    expect(r.quality.total).toBe(2);
  });
});

describe("写权限", () => {
  it("无权限用户不能写入审计记录", () => {
    const hasWrite = false;
    const rec = hasWrite ? recordAdviceV5(base) : null;
    expect(rec).toBeNull();
  });
});
