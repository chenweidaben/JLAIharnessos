/**
 * 健澜科技 jlmedaios - 大模型微调与人在环反馈 V5 单测（M280-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessFinetuneV5,
  buildFinetuneLoopV5Report,
  loopFeedbackV5,
  prepareTrainDataV5,
  type HumanFeedback,
} from "../../src/bff/aggregators/finetuneLoopV5Aggregator";
import { finetuneLoopV5Routes } from "../../src/bff/routes/finetuneLoopV5";

describe("prepareTrainDataV5", () => {
  it("1条接受+1条修正→2个训练样本", () => {
    const fb: HumanFeedback[] = [
      { adviceId: "a1", accepted: true, rejected: false, correction: "", reviewer: "张" },
      { adviceId: "a2", accepted: false, rejected: true, correction: "改药", reviewer: "李" },
    ];
    expect(prepareTrainDataV5(fb).samples).toBe(2);
  });
});

describe("assessFinetuneV5", () => {
  it("80→86提升6%达标", () => {
    const r = assessFinetuneV5(80, 86);
    expect(r.improvement).toBe(6);
    expect(r.targetMet).toBe(true);
  });
  it("80→82仅提升2%未达标", () => {
    expect(assessFinetuneV5(80, 82).targetMet).toBe(false);
  });
});

describe("loopFeedbackV5", () => {
  it("3条1条未处理→pending=1", () => {
    const fb: HumanFeedback[] = [
      { adviceId: "a1", accepted: true, rejected: false, correction: "", reviewer: "张" },
      { adviceId: "a2", accepted: false, rejected: true, correction: "改药", reviewer: "李" },
      { adviceId: "a3", accepted: false, rejected: false, correction: "", reviewer: "" },
    ];
    expect(loopFeedbackV5(fb).pending).toBe(1);
  });
});

describe("buildFinetuneLoopV5Report", () => {
  it("统计反馈与训练样本", () => {
    const fb: HumanFeedback[] = [
      { adviceId: "a1", accepted: true, rejected: false, correction: "", reviewer: "张" },
      { adviceId: "a2", accepted: false, rejected: true, correction: "改药", reviewer: "李" },
    ];
    const r = buildFinetuneLoopV5Report(fb, [3.5, 5.2]);
    expect(r.trainSamples).toBe(2);
    expect(r.avgImprovement).toBe(4.35);
  });
});

describe("写权限", () => {
  it("POST /job 路由启用 auth 并声明写权限", () => {
    const postRoute = finetuneLoopV5Routes.find((r) => r.method === "POST");
    expect(postRoute).toBeDefined();
    expect(postRoute!.auth).toBe(true);
    expect(postRoute!.path).toBe("/api/v1/finetune-loop/job");
  });
});
