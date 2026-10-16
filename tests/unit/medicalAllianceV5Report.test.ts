/**
 * 健澜科技 jlmedaios - 医联体分级诊疗智能化 V5 纯函数单测（M262-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessGradingV5,
  buildMedicalAllianceV5Report,
  recommendReferralV5,
} from "../../src/bff/aggregators/medicalAllianceV5ReportAggregator";

describe("recommendReferralV5", () => {
  it("基层+危重 → 上转三级绿色通道", () => {
    expect(recommendReferralV5({ condition: "心梗", severity: "危重" }, { current: "基层", target: "三级" }).greenChannel).toBe(true);
  });
});

describe("assessGradingV5", () => {
  it("急性+复杂 → 三级医院", () => {
    expect(assessGradingV5({ age: 50, chronic: 1 }, { acute: true, complexity: "复杂" }).recommended).toBe("三级医院");
  });
});

describe("buildMedicalAllianceV5Report", () => {
  it("生成组织数据", () => {
    const r = buildMedicalAllianceV5Report("30d");
    expect(r.organization.cityGroup).toBeGreaterThan(0);
  });

  it("生成转诊数据", () => {
    const r = buildMedicalAllianceV5Report("30d");
    expect(r.referral.up).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMedicalAllianceV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
