/**
 * 健澜科技 jlmedaios - 隐私计算与数据要素流通 V5 纯函数单测（M261-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPrivacyComputeV5Report,
  classifyDataSensitivityV5,
  computeFederatedV5,
} from "../../src/bff/aggregators/privacyComputeV5ReportAggregator";

describe("classifyDataSensitivityV5", () => {
  it("敏感+含PHI → 核心级P3", () => {
    expect(classifyDataSensitivityV5({ type: "敏感", containsPHI: true }).level).toBe("核心");
  });
});

describe("computeFederatedV5", () => {
  it("3家联合建模 → 数据不出院", () => {
    expect(computeFederatedV5(3, "慢病预测").dataLeave).toBe(false);
  });
});

describe("buildPrivacyComputeV5Report", () => {
  it("生成分类分级数据", () => {
    const r = buildPrivacyComputeV5Report("30d");
    expect(r.classification.public).toBeGreaterThan(0);
  });

  it("生成隐私计算数据", () => {
    const r = buildPrivacyComputeV5Report("30d");
    expect(r.privacyCompute.federated).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPrivacyComputeV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
