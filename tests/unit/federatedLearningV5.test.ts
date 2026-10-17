/**
 * 健澜科技 jlmedaios - 隐私计算与联邦学习 V5 单测（M282-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateModelV5,
  buildFederatedLearningV5Report,
  evalFederatedV5,
  initFederatedV5,
  type FederatedTask,
  type ModelUpdate,
} from "../../src/bff/aggregators/federatedLearningV5Aggregator";
import { federatedLearningV5Routes } from "../../src/bff/routes/federatedLearningV5";

describe("initFederatedV5", () => {
  it("3机构任务→参与机构3", () => {
    const t: FederatedTask = { taskName: "t", orgs: ["A", "B", "C"], modelType: "xgb", rounds: 10 };
    expect(initFederatedV5(t).participatingOrgs).toBe(3);
  });
});

describe("aggregateModelV5", () => {
  it("A权重0.6(600样本)+B权重0.4(400样本)→加权0.52", () => {
    // 0.6*0.6 + 0.4*0.4 = 0.36+0.16 = 0.52
    const updates: ModelUpdate[] = [
      { org: "A", weights: [0.6], sampleSize: 600 },
      { org: "B", weights: [0.4], sampleSize: 400 },
    ];
    expect(aggregateModelV5(updates).globalWeights[0]).toBe(0.52);
  });
});

describe("evalFederatedV5", () => {
  it("全局88/本地均值80.33→增益7.67有益", () => {
    // (82+80+79)/3 = 80.33, 88-80.33 = 7.67
    const r = evalFederatedV5({ globalAccuracy: 88, localAccuracies: { A: 82, B: 80, C: 79 } });
    expect(r.beneficial).toBe(true);
    expect(r.globalGain).toBeCloseTo(7.67, 1);
  });
});

describe("buildFederatedLearningV5Report", () => {
  it("1任务3机构→totalOrgs=3", () => {
    const tasks: FederatedTask[] = [
      { taskName: "t", orgs: ["A", "B", "C"], modelType: "xgb", rounds: 10 },
    ];
    expect(buildFederatedLearningV5Report(tasks, []).totalOrgs).toBe(3);
  });
});

describe("federatedLearningV5Routes 写权限", () => {
  it("POST /api/v1/federated-learning/job 路由存在且 auth:true", () => {
    const post = federatedLearningV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/federated-learning/job");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
