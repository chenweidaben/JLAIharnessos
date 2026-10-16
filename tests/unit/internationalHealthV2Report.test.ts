/**
 * 健澜科技 jlmedaios - 国际医疗 V2 纯函数单测（M236-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessJCIReadiness,
  buildInternationalHealthV2Report,
  routeInternationalPatient,
} from "../../src/bff/aggregators/internationalHealthV2ReportAggregator";

describe("assessJCIReadiness", () => {
  it("标准齐全 → 通过", () => {
    expect(assessJCIReadiness("标准齐全").pass).toBe(true);
  });
});

describe("routeInternationalPatient", () => {
  it("美国患者 → 国际医疗部", () => {
    expect(routeInternationalPatient("美国").department).toContain("国际");
  });
});

describe("buildInternationalHealthV2Report", () => {
  it("生成国际部数据", () => {
    const r = buildInternationalHealthV2Report("30d");
    expect(r.dept.intl).toBeGreaterThan(0);
  });

  it("生成跨境数据", () => {
    const r = buildInternationalHealthV2Report("30d");
    expect(r.crossBorder.consult).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInternationalHealthV2Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
