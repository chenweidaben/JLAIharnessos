/**
 * 健澜科技 jlmedaios - AI 手术全流程闭环 V5 纯函数单测（M258-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSurgeryAIClosedLoopV5Report,
  optimizeORScheduleV5,
  predictSurgeryRiskV5,
} from "../../src/bff/aggregators/surgeryAIClosedLoopV5ReportAggregator";

describe("predictSurgeryRiskV5", () => {
  it("70岁+3种合并症+四级手术+5小时 → 高危", () => {
    expect(predictSurgeryRiskV5({ age: 70, comorbidity: 3 }, { grade: "四级", duration: 5 }).level).toBe("高危");
  });
});

describe("optimizeORScheduleV5", () => {
  it("180台/10间 → 利用率90%优化", () => {
    expect(optimizeORScheduleV5(180, 10).optimized).toBe(true);
  });
});

describe("buildSurgeryAIClosedLoopV5Report", () => {
  it("生成术前数据", () => {
    const r = buildSurgeryAIClosedLoopV5Report("30d");
    expect(r.preOp.aiAssess).toBeGreaterThan(0);
  });

  it("生成质量数据", () => {
    const r = buildSurgeryAIClosedLoopV5Report("30d");
    expect(r.quality.ssi).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSurgeryAIClosedLoopV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
