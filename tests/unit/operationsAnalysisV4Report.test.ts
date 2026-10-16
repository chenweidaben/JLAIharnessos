/**
 * 健澜科技 jlmedaios - 运营分析 V4 纯函数单测（M254-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeOutpatientV4,
  buildOperationsAnalysisV4Report,
  forecastOperationsV4,
} from "../../src/bff/aggregators/operationsAnalysisV4ReportAggregator";

describe("analyzeOutpatientV4", () => {
  it("门诊10000收入3000000 → 均次300", () => {
    expect(analyzeOutpatientV4(10000, 3000000).avgCost).toBe(300);
  });
});

describe("forecastOperationsV4", () => {
  it("历史门诊5000×3 → 预测5000无预警", () => {
    expect(forecastOperationsV4({ outpatient: [5000, 5000, 5000], inpatient: [1000, 1000, 1000] }, 1).capacityAlert).toBe(false);
  });
});

describe("buildOperationsAnalysisV4Report", () => {
  it("生成门诊数据", () => {
    const r = buildOperationsAnalysisV4Report("30d");
    expect(r.outpatient.visits).toBeGreaterThan(0);
  });

  it("生成财务数据", () => {
    const r = buildOperationsAnalysisV4Report("30d");
    expect(r.finance.revenue).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOperationsAnalysisV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
