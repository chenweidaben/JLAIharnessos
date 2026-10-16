/**
 * 健澜科技 jlmedaios - HRP V4 纯函数单测（M250-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeResourceUtilizationV4,
  buildHRPV4Report,
  integrateHRPDataV4,
} from "../../src/bff/aggregators/hrpV4ReportAggregator";

describe("integrateHRPDataV4", () => {
  it("人力+财务+供应链 → 集成成功", () => {
    expect(integrateHRPDataV4({ headcount: 3000 }, { revenue: 10000 }, { inventory: 5000 }).integrated).toBe(true);
  });
});

describe("analyzeResourceUtilizationV4", () => {
  it("床位90设备80人员70 → 综合80", () => {
    expect(analyzeResourceUtilizationV4({ bed: 90, equipment: 80, staff: 70 }).overall).toBe(80);
  });
});

describe("buildHRPV4Report", () => {
  it("生成人力数据", () => {
    const r = buildHRPV4Report("30d");
    expect(r.hr.headcount).toBeGreaterThan(0);
  });

  it("生成财务数据", () => {
    const r = buildHRPV4Report("30d");
    expect(r.finance.gl).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildHRPV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
