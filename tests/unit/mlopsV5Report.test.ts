/**
 * 健澜科技 jlmedaios - MLOps 模型工程 V5 纯函数单测（M260-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMLOpsV5Report,
  detectDriftV5,
  registerModelV5,
} from "../../src/bff/aggregators/mlopsV5ReportAggregator";

describe("registerModelV5", () => {
  it("注册模型v1.0 → 成功带模型卡", () => {
    expect(registerModelV5("dx-model", "v1.0").registered).toBe(true);
  });
});

describe("detectDriftV5", () => {
  it("准确率下降8% → 漂移预警", () => {
    expect(detectDriftV5({ accuracy: 82, distribution: 0 }, { accuracy: 90, distribution: 0 }).drift).toBe(true);
  });
});

describe("buildMLOpsV5Report", () => {
  it("生成模型仓库数据", () => {
    const r = buildMLOpsV5Report("30d");
    expect(r.modelRepo.online).toBeGreaterThan(0);
  });

  it("生成部署数据", () => {
    const r = buildMLOpsV5Report("30d");
    expect(r.deployment.onlineInference).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMLOpsV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
