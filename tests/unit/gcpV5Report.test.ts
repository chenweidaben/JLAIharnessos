/**
 * 健澜科技 jlmedaios - 药物临床试验 GCP V5 纯函数单测（M269-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildGCPV5Report,
  reportSAEV5,
  screenSubjectV5,
} from "../../src/bff/aggregators/gcpV5ReportAggregator";

describe("screenSubjectV5", () => {
  it("年龄35+无排除疾病 → 符合入选标准", () => {
    expect(screenSubjectV5({ ageMin: 18, ageMax: 65, include: ["高血压"], exclude: ["妊娠"] }, { age: 35, conditions: ["高血压"] }).eligible).toBe(true);
  });
});

describe("reportSAEV5", () => {
  it("严重不良事件+相关 → 需报告时限24h", () => {
    expect(reportSAEV5({ severity: "死亡", related: true }, { initial: 24, followup: 7 }).reportable).toBe(true);
  });
});

describe("buildGCPV5Report", () => {
  it("生成试验项目数据", () => {
    const r = buildGCPV5Report("30d");
    expect(r.projects.be).toBeGreaterThan(0);
  });

  it("生成受试者数据", () => {
    const r = buildGCPV5Report("30d");
    expect(r.subjects.enrollment).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGCPV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
