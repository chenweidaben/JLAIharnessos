/**
 * 健澜科技 jlmedaios - 个人智能体训练数据沉淀 V13 单测（M319-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTrainingFlywheelV13,
  computeSuccessFailureRatioV13,
  countTrainingSamplesV13,
  type TrainingRecordV13,
} from "../../src/bff/aggregators/museTrainingDataV13Aggregator";
import { museTrainingDataV13Routes } from "../../src/bff/routes/museTrainingDataV13";

const records: TrainingRecordV13[] = [
  { recordId: "r1", doctorId: "D01", week: "W1", isSuccess: true },
  { recordId: "r2", doctorId: "D01", week: "W1", isSuccess: false },
  { recordId: "r3", doctorId: "D01", week: "W2", isSuccess: true },
  { recordId: "r4", doctorId: "D01", week: "W2", isSuccess: true },
  { recordId: "r5", doctorId: "D01", week: "W2", isSuccess: false },
  { recordId: "r6", doctorId: "D01", week: "W3", isSuccess: true },
  { recordId: "r7", doctorId: "D01", week: "W3", isSuccess: true },
  { recordId: "r8", doctorId: "D01", week: "W3", isSuccess: true },
  { recordId: "r9", doctorId: "D01", week: "W4", isSuccess: true },
  { recordId: "r10", doctorId: "D01", week: "W4", isSuccess: false },
];

describe("countTrainingSamplesV13", () => {
  // 算式：10 条记录 → 样本量 = 10
  it("totalSamples = 10", () => {
    expect(countTrainingSamplesV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(countTrainingSamplesV13([])).toBe(0);
  });
});

describe("computeSuccessFailureRatioV13", () => {
  // 算式：成功 = r1+r3+r4+r6+r7+r8+r9 = 7
  // successRate = 7/10×100 = 70
  it("successRate = 70", () => {
    expect(computeSuccessFailureRatioV13(records)).toBe(70);
  });
});

describe("buildTrainingFlywheelV13", () => {
  // 算式：W1=2, W2=3, W3=3, W4=2
  // 累计：W1=2, W2=5, W3=8, W4=10
  it("flywheel = [W1:2, W2:5, W3:8, W4:10]", () => {
    const trend = buildTrainingFlywheelV13(records);
    expect(trend.length).toBe(4);
    expect(trend[0].week).toBe("W1");
    expect(trend[0].cumulativeSamples).toBe(2);
    expect(trend[1].cumulativeSamples).toBe(5);
    expect(trend[2].cumulativeSamples).toBe(8);
    expect(trend[3].cumulativeSamples).toBe(10);
  });
});

describe("museTrainingDataV13Routes 读路由", () => {
  it("GET /api/v1/muse-training-data 路由存在且 auth:true", () => {
    const route = museTrainingDataV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/muse-training-data",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
