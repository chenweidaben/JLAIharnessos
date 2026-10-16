/**
 * 健澜科技 jlmedaios - ESG 与可持续发展 V5 纯函数单测（M261-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildESGV5Report,
  calculateCarbonFootprintV5,
  scoreESGV5,
} from "../../src/bff/aggregators/esgV5ReportAggregator";

describe("calculateCarbonFootprintV5", () => {
  it("10000度电+1000方气+10吨垃圾+1000km → 碳足迹", () => {
    expect(calculateCarbonFootprintV5({ kwh: 10000, naturalGas: 1000 }, { tons: 10 }, { km: 1000 }).total).toBeGreaterThan(0);
  });
});

describe("scoreESGV5", () => {
  it("E90+S85+G90 → 总分88.5 B+", () => {
    expect(scoreESGV5(90, 85, 90).grade).toBe("B+");
  });
});

describe("buildESGV5Report", () => {
  it("生成环境数据", () => {
    const r = buildESGV5Report("30d");
    expect(r.environment.carbonAccounting).toBeGreaterThan(0);
  });

  it("生成社会数据", () => {
    const r = buildESGV5Report("30d");
    expect(r.social.patientSafety).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildESGV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
