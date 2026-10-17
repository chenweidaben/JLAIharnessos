/**
 * 健澜科技 jlmedaios - 医院质量监测 HQMS V5 单测（M278-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessQualityV5,
  benchmarkHQMSV5,
  buildHQMSV5Report,
  collectHQMSMetricsV5,
} from "../../src/bff/aggregators/hqmsV5Aggregator";

describe("collectHQMSMetricsV5", () => {
  it("为31天死亡率补全基准1.5", () => {
    const r = collectHQMSMetricsV5([
      { metricCode: "mortality-30d", metricName: "31天死亡率", value: 1.2, period: "2026Q3", department: "全院" },
    ]);
    expect(r[0].benchmark).toBe(1.5);
  });
});

describe("benchmarkHQMSV5", () => {
  it("死亡率1.2低于基准1.5→better=true", () => {
    const r = benchmarkHQMSV5(collectHQMSMetricsV5([
      { metricCode: "mortality-30d", metricName: "x", value: 1.2, period: "p", department: "d" },
    ]));
    expect(r[0].better).toBe(true);
    expect(r[0].gap).toBe(-0.3);
  });
  it("院感3.5高于基准3.0→better=false", () => {
    const r = benchmarkHQMSV5(collectHQMSMetricsV5([
      { metricCode: "infection-ipm", metricName: "x", value: 3.5, period: "p", department: "d" },
    ]));
    expect(r[0].better).toBe(false);
  });
});

describe("assessQualityV5", () => {
  it("3项达标2项→66.7%→C", () => {
    const metrics = collectHQMSMetricsV5([
      { metricCode: "mortality-30d", metricName: "x", value: 1.2, period: "p", department: "d" },
      { metricCode: "infection-ipm", metricName: "x", value: 3.5, period: "p", department: "d" },
      { metricCode: "bed-turnover", metricName: "x", value: 28, period: "p", department: "d" },
    ]);
    const q = assessQualityV5(metrics);
    expect(q.passCount).toBe(2);
    expect(q.grade).toBe("C");
  });
});

describe("buildHQMSV5Report", () => {
  it("列出未达标指标", () => {
    const metrics = collectHQMSMetricsV5([
      { metricCode: "infection-ipm", metricName: "x", value: 3.5, period: "p", department: "d" },
    ]);
    const r = buildHQMSV5Report(metrics);
    expect(r.belowBenchmark).toContain("infection-ipm");
  });
});
