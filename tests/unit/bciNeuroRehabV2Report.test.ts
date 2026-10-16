/**
 * 健澜科技 jlmedaios - 脑机接口 V2 纯函数单测（M247-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBCINeuroRehabV2Report,
  decodeEEGV2,
  designNeuroRehabPlanV2,
} from "../../src/bff/aggregators/bciNeuroRehabV2ReportAggregator";

describe("decodeEEGV2", () => {
  it("准确率85 → 可靠", () => {
    expect(decodeEEGV2({ channels: 32, samples: 1000, accuracy: 85 }).reliable).toBe(true);
  });
});

describe("designNeuroRehabPlanV2", () => {
  it("卒中重度 → BCI+外骨骼", () => {
    expect(designNeuroRehabPlanV2({ name: "张三", age: 65 }, { type: "stroke", severity: 4 }).modality).toBe("BCI+外骨骼");
  });
});

describe("buildBCINeuroRehabV2Report", () => {
  it("生成 BCI 数据", () => {
    const r = buildBCINeuroRehabV2Report("30d");
    expect(r.bci.nonInvasive).toBeGreaterThan(0);
  });

  it("生成刺激数据", () => {
    const r = buildBCINeuroRehabV2Report("30d");
    expect(r.stimulation.tms).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildBCINeuroRehabV2Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
