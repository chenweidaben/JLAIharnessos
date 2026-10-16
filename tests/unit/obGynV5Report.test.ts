/**
 * 健澜科技 jlmedaios - 妇产科与围产 V5 纯函数单测（M266-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessPregnancyRiskV5,
  buildObstetricsGynecologyV5Report,
  screenPostpartumDepressionV5,
} from "../../src/bff/aggregators/obstetricsGynecologyV5ReportAggregator";

describe("assessPregnancyRiskV5", () => {
  it("40岁+BP 150+GDM → 高危黄色需高危门诊", () => {
    expect(assessPregnancyRiskV5({ age: 40, priorCSection: false, hypertension: true, diabetes: false }, { bp: 150, glucose: 8.5, multiple: false }).color).toBe("黄色");
  });
});

describe("screenPostpartumDepressionV5", () => {
  it("EPDS 14 → 阳性需心理评估干预", () => {
    expect(screenPostpartumDepressionV5({ score: 14 }).positive).toBe(true);
  });
});

describe("buildObstetricsGynecologyV5Report", () => {
  it("生成产检数据", () => {
    const r = buildObstetricsGynecologyV5Report("30d");
    expect(r.prenatal.anc).toBeGreaterThan(0);
  });

  it("生成妇科数据", () => {
    const r = buildObstetricsGynecologyV5Report("30d");
    expect(r.gynecology.fibroid).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildObstetricsGynecologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
