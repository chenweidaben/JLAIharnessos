/**
 * 健澜科技 jlmedaios - 区域健康大脑纯函数单测（M232-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRegionalSharing,
  buildRegionalHealthBrainReport,
  coordinateReferral,
} from "../../src/bff/aggregators/regionalBrainReportAggregator";

describe("coordinateReferral", () => {
  it("从社区到三甲 → 转诊单生成", () => {
    const r = coordinateReferral("张三", "社区卫生中心", "三甲医院");
    expect(r.referralId).toContain("REF-");
  });
});

describe("assessRegionalSharing", () => {
  it("10000条 → 高级", () => {
    expect(assessRegionalSharing(10000).level).toBe("高级");
  });

  it("5000条 → 中级", () => {
    expect(assessRegionalSharing(5000).level).toBe("中级");
  });
});

describe("buildRegionalHealthBrainReport", () => {
  it("生成医联体数据", () => {
    const r = buildRegionalHealthBrainReport("30d");
    expect(r.alliance.unions).toBeGreaterThan(0);
  });

  it("生成转诊数据", () => {
    const r = buildRegionalHealthBrainReport("30d");
    expect(r.referral.primaryCare).toBeGreaterThan(0);
  });

  it("生成中心数据", () => {
    const r = buildRegionalHealthBrainReport("30d");
    expect(r.centers.imaging).toBe(true);
  });

  it("生成建议", () => {
    const r = buildRegionalHealthBrainReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
