/**
 * 健澜科技 jlmedaios - 区域医联体 V4 纯函数单测（M253-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRegionalSharingV4,
  buildRegionalMedicalAllianceV4Report,
  coordinateReferralV4,
} from "../../src/bff/aggregators/regionalMedicalAllianceV4ReportAggregator";

describe("coordinateReferralV4", () => {
  it("卒中患者转诊 → 绿色通道30分钟", () => {
    expect(coordinateReferralV4({ name: "张三", diagnosis: "急性卒中" }, "卫生院", "三甲").greenChannel).toBe(true);
  });
});

describe("assessRegionalSharingV4", () => {
  it("影像5000+检验3000+病理500+心电2000 → 共享率105%", () => {
    expect(assessRegionalSharingV4({ image: 5000, lab: 3000, pathology: 500, cardiac: 2000 }).total).toBe(10500);
  });
});

describe("buildRegionalMedicalAllianceV4Report", () => {
  it("生成组织数据", () => {
    const r = buildRegionalMedicalAllianceV4Report("30d");
    expect(r.organization.cityGroup).toBeGreaterThan(0);
  });

  it("生成转诊数据", () => {
    const r = buildRegionalMedicalAllianceV4Report("30d");
    expect(r.referral.up).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildRegionalMedicalAllianceV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
