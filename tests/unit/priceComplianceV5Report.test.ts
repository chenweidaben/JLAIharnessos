/**
 * 健澜科技 jlmedaios - 价格管理与收费合规 V5 单测（M271-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPriceComplianceV5Report,
  comparePriceV5,
  validateChargeV5,
} from "../../src/bff/aggregators/priceComplianceV5ReportAggregator";

describe("validateChargeV5", () => {
  it("价格100规定100→合规", () => {
    expect(validateChargeV5("挂号", 100, 100).compliant).toBe(true);
  });
  it("价格150规定100→超标准收费", () => {
    expect(validateChargeV5("挂号", 150, 100).reason).toBe("超标准收费");
  });
});

describe("comparePriceV5", () => {
  it("目录100→gap=5 level=预警", () => {
    const r = comparePriceV5("检查", 100);
    expect(r.gap).toBe(5);
    expect(r.level).toBe("预警");
  });
});

describe("buildPriceComplianceV5Report", () => {
  it("生成价格目录数据", () => {
    expect(buildPriceComplianceV5Report("30d").catalog.medicalService).toBeGreaterThan(0);
  });
  it("生成收费合规数据", () => {
    expect(buildPriceComplianceV5Report("30d").compliance.selfCheck).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildPriceComplianceV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
