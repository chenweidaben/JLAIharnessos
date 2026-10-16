/**
 * 健澜科技 jlmedaios - 集团质控与标准统一 V5 单测（M273-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  benchmarkQualityV5,
  buildGroupQAV5Report,
  standardizePathwayV5,
} from "../../src/bff/aggregators/groupQAV5ReportAggregator";

describe("benchmarkQualityV5", () => {
  it("3院区90/80/100→avg=90 best=院区C", () => {
    const r = benchmarkQualityV5([{ name: "A", score: 90 }, { name: "B", score: 80 }, { name: "C", score: 100 }]);
    expect(r.avg).toBe(90);
    expect(r.best).toBe("C");
  });
});

describe("standardizePathwayV5", () => {
  it("集团统一→v2.0", () => {
    expect(standardizePathwayV5("肺炎", true).version).toBe("v2.0");
  });
});

describe("buildGroupQAV5Report", () => {
  it("生成质控指标数据", () => {
    expect(buildGroupQAV5Report("30d").qaMetrics.medicalQuality).toBeGreaterThan(0);
  });
  it("生成标准数据", () => {
    expect(buildGroupQAV5Report("30d").standards.clinicalPathway).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildGroupQAV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
