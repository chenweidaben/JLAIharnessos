/**
 * 健澜科技 jlmedaios - AI 药物研发 纯函数单测（M237-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAIDrugDiscoveryReport,
  mineADRSignal,
  predictADMET,
} from "../../src/bff/aggregators/aiDrugDiscoveryReportAggregator";

describe("predictADMET", () => {
  it("安全分子 → 通过", () => {
    expect(predictADMET("安全小分子").pass).toBe(true);
  });
});

describe("mineADRSignal", () => {
  it("严重不良反应报告 → 警报", () => {
    expect(mineADRSignal("严重不良反应").alert).toBe(true);
  });
});

describe("buildAIDrugDiscoveryReport", () => {
  it("生成筛选数据", () => {
    const r = buildAIDrugDiscoveryReport("30d");
    expect(r.discovery.screening).toBeGreaterThan(0);
  });

  it("生成临床数据", () => {
    const r = buildAIDrugDiscoveryReport("30d");
    expect(r.clinical.recruitment).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildAIDrugDiscoveryReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
