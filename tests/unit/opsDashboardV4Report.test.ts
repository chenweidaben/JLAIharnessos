/**
 * 健澜科技 jlmedaios - 运营驾驶舱 V4 纯函数单测（M250-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOpsDashboardV4Report,
  detectAnomalyV4,
  predictOperationsV4,
} from "../../src/bff/aggregators/opsDashboardV4ReportAggregator";

describe("predictOperationsV4", () => {
  it("历史门诊上升 → 预测上升", () => {
    expect(predictOperationsV4({ outpatient: [100, 120], inpatient: [50, 60] }, 1).trend).toBe("上升");
  });
});

describe("detectAnomalyV4", () => {
  it("床位率+平均住院日双超 → 红灯", () => {
    expect(detectAnomalyV4({ bedRate: 95, avgStay: 10 }, { bedRate: 90, avgStay: 8 }).level).toBe("红");
  });
});

describe("buildOpsDashboardV4Report", () => {
  it("生成实时数据", () => {
    const r = buildOpsDashboardV4Report("30d");
    expect(r.realtime.outpatient).toBeGreaterThan(0);
  });

  it("生成预测数据", () => {
    const r = buildOpsDashboardV4Report("30d");
    expect(r.forecast.tomorrow).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOpsDashboardV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
