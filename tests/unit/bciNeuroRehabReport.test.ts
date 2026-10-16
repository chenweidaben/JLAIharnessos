/**
 * 健澜科技 jlmedaios - 脑机接口与神经康复 纯函数单测（M237-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBCINeuroRehabReport,
  decodeEEG,
  designNeuroRehabPlan,
} from "../../src/bff/aggregators/bciNeuroRehabReportAggregator";

describe("decodeEEG", () => {
  it("运动想象EEG → 解码85%", () => {
    expect(decodeEEG("运动想象").accuracy).toBeGreaterThan(0);
  });
});

describe("designNeuroRehabPlan", () => {
  it("卒中患者 → 4步方案", () => {
    expect(designNeuroRehabPlan("卒中", "左侧偏瘫").plan.length).toBe(4);
  });
});

describe("buildBCINeuroRehabReport", () => {
  it("生成BCI数据", () => {
    const r = buildBCINeuroRehabReport("30d");
    expect(r.bci.acquisition).toBeGreaterThan(0);
  });

  it("生成卒中数据", () => {
    const r = buildBCINeuroRehabReport("30d");
    expect(r.stroke.patients).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildBCINeuroRehabReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
