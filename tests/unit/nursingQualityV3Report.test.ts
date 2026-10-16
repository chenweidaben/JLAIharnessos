/**
 * 健澜科技 jlmedaios - 护理质量 V3 纯函数单测（M241-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessNursingSensitivity,
  buildNursingQualityV3Report,
  planNursingCare,
} from "../../src/bff/aggregators/nursingQualityV3ReportAggregator";

describe("assessNursingSensitivity", () => {
  it("压疮3跌倒8 → 达标", () => {
    expect(assessNursingSensitivity({ pressureUlcer: 3, fall: 8, tubeFall: 5 }).goal).toBe(true);
  });
});

describe("planNursingCare", () => {
  it("跌倒风险 → 加防跌倒", () => {
    expect(planNursingCare({ age: 75, level: "一级", risk: "跌倒" }).items).toContain("防跌倒");
  });
});

describe("buildNursingQualityV3Report", () => {
  it("生成敏感指标数据", () => {
    const r = buildNursingQualityV3Report("30d");
    expect(r.sensitivity.pressure).toBeGreaterThanOrEqual(0);
  });

  it("生成分级护理数据", () => {
    const r = buildNursingQualityV3Report("30d");
    expect(r.graded.grade1).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildNursingQualityV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
