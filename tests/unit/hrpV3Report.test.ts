/**
 * 健澜科技 jlmedaios - HRP V3 纯函数单测（M240-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeResourceUtilization,
  buildHRPV3Report,
  integrateHRPData,
} from "../../src/bff/aggregators/hrpV3ReportAggregator";

describe("integrateHRPData", () => {
  it("HR100+财务200+物资300 → 600已集成", () => {
    const r = integrateHRPData(100, 200, 300);
    expect(r.total).toBe(600);
    expect(r.integrated).toBe(true);
  });
});

describe("analyzeResourceUtilization", () => {
  it("床位800/1000 → 80%", () => {
    expect(analyzeResourceUtilization({ room: 800, equipment: 250, staff: 700 }).room).toBe(80);
  });
});

describe("buildHRPV3Report", () => {
  it("生成人力数据", () => {
    const r = buildHRPV3Report("30d");
    expect(r.hr.headcount).toBeGreaterThan(0);
  });

  it("生成物资数据", () => {
    const r = buildHRPV3Report("30d");
    expect(r.supply.spd).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildHRPV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
