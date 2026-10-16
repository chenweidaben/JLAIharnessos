/**
 * 健澜科技 jlmedaios - 运营驾驶舱 V3 纯函数单测（M240-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOpsDashboardV3Report,
  detectAnomaly,
  predictOperations,
} from "../../src/bff/aggregators/opsDashboardV3ReportAggregator";

describe("predictOperations", () => {
  it("历史1000 → 预测7天", () => {
    expect(predictOperations([1000], 7).forecast.length).toBe(7);
  });
});

describe("detectAnomaly", () => {
  it("指标[100,200,50]阈值150 → 1个异常", () => {
    expect(detectAnomaly([100, 200, 50], 150).count).toBe(1);
  });
});

describe("buildOpsDashboardV3Report", () => {
  it("生成实时数据", () => {
    const r = buildOpsDashboardV3Report("30d");
    expect(r.realtime.outpatient).toBeGreaterThan(0);
  });

  it("生成会议数据", () => {
    const r = buildOpsDashboardV3Report("30d");
    expect(r.meetings.daily).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOpsDashboardV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
