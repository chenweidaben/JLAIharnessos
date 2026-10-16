/**
 * 健澜科技 jlmedaios - 国际医疗 V3 纯函数单测（M246-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessJCIReadinessV3,
  buildInternationalHealthV3Report,
  routeInternationalPatientV3,
} from "../../src/bff/aggregators/internationalHealthV3ReportAggregator";

describe("assessJCIReadinessV3", () => {
  it("三项均90 → 就绪", () => {
    expect(assessJCIReadinessV3({ patientCentered: 90, orgManagement: 90, improvement: 90 }).ready).toBe(true);
  });
});

describe("routeInternationalPatientV3", () => {
  it("外籍英语国际保险 → 国际部+翻译", () => {
    const r = routeInternationalPatientV3({ nationality: "US", insurance: "international", language: "en" });
    expect(r.department).toBe("国际部");
    expect(r.interpreter).toBe(true);
  });
});

describe("buildInternationalHealthV3Report", () => {
  it("生成服务数据", () => {
    const r = buildInternationalHealthV3Report("30d");
    expect(r.services.vipWard).toBeGreaterThan(0);
  });

  it("生成认证数据", () => {
    const r = buildInternationalHealthV3Report("30d");
    expect(r.accreditation.jci).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInternationalHealthV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
