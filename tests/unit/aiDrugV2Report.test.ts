/**
 * 健澜科技 jlmedaios - AI 药物 V2 纯函数单测（M247-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAIDrugV2Report,
  mineADRSignalV2,
  predictADMETV2,
} from "../../src/bff/aggregators/aiDrugV2ReportAggregator";

describe("predictADMETV2", () => {
  it("Lipinski通过+溶解度60 → 类药", () => {
    expect(predictADMETV2({ name: "Aspirin", lipinski: true, solubility: 60 }).druglike).toBe(true);
  });
});

describe("mineADRSignalV2", () => {
  it("报告50期望10 → PRR5.0信号", () => {
    expect(mineADRSignalV2({ drug: "Warfarin", adverse: "Bleeding", count: 50, expected: 10 }).signal).toBe(true);
  });
});

describe("buildAIDrugV2Report", () => {
  it("生成发现数据", () => {
    const r = buildAIDrugV2Report("30d");
    expect(r.discovery.targets).toBeGreaterThan(0);
  });

  it("生成临床数据", () => {
    const r = buildAIDrugV2Report("30d");
    expect(r.clinical.trials).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildAIDrugV2Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
