/**
 * 健澜科技 jlmedaios - 儿科与新生儿 V5 纯函数单测（M266-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessGrowthV5,
  buildPediatricsV5Report,
  classifyNeonatalJaundiceV5,
} from "../../src/bff/aggregators/pediatricsV5ReportAggregator";

describe("assessGrowthV5", () => {
  it("2岁儿童身高85cm → 生长迟缓需营养干预", () => {
    expect(assessGrowthV5({ value: 12 }, { value: 85 }, { value: 2 }, { value: "M" }).status).toBe("生长迟缓");
  });
});

describe("classifyNeonatalJaundiceV5", () => {
  it("生后12小时胆红素220 → 病理性需光疗换血评估", () => {
    expect(classifyNeonatalJaundiceV5({ value: 220 }, { value: 12 }).level).toBe("病理性");
  });
});

describe("buildPediatricsV5Report", () => {
  it("生成新生儿数据", () => {
    const r = buildPediatricsV5Report("30d");
    expect(r.neonate.nicu).toBeGreaterThan(0);
  });

  it("生成呼吸数据", () => {
    const r = buildPediatricsV5Report("30d");
    expect(r.respiratory.asthma).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPediatricsV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
