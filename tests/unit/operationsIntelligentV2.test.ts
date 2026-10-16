/**
 * 健澜科技 jlmedaios - 运营决策智能化 V2 纯函数单测（M233-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOperationsIntelligentV2,
  forecastVolume,
  optimizeScheduling,
} from "../../src/bff/aggregators/operationsIntelligentV2Aggregator";

describe("forecastVolume", () => {
  it("历史1000 → 预测1100", () => {
    expect(forecastVolume(1000, "月").forecast).toBe(1100);
  });
});

describe("optimizeScheduling", () => {
  it("需求85 资源100 → 利用率85%", () => {
    expect(optimizeScheduling(85, 100).utilization).toBe(85);
  });
});

describe("buildOperationsIntelligentV2", () => {
  it("生成预测数据", () => {
    const r = buildOperationsIntelligentV2("30d");
    expect(r.forecast.outpatient).toBeGreaterThan(0);
  });

  it("生成排班数据", () => {
    const r = buildOperationsIntelligentV2("30d");
    expect(r.scheduling.utilization).toBeGreaterThan(0);
  });

  it("生成SPD数据", () => {
    const r = buildOperationsIntelligentV2("30d");
    expect(r.spd.smart).toBe(true);
  });

  it("生成建议", () => {
    const r = buildOperationsIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
