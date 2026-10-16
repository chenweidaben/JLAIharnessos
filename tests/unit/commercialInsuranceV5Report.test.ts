/**
 * 健澜科技 jlmedaios - 商业健康保险与惠民保 V5 纯函数单测（M262-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCommercialInsuranceV5Report,
  designInsuranceProductV5,
  settleCommercialClaimV5,
} from "../../src/bff/aggregators/commercialInsuranceV5ReportAggregator";

describe("settleCommercialClaimV5", () => {
  it("总10000+免赔2000+比例80% → 应付6400", () => {
    expect(settleCommercialClaimV5({ total: 10000, covered: 8000 }, { deductible: 2000, ratio: 0.8 }).payable).toBe(6400);
  });
});

describe("designInsuranceProductV5", () => {
  it("65岁+慢病 → 惠民保", () => {
    expect(designInsuranceProductV5({ age: 65, chronic: true }, { coverage: "住院", premium: 100 }).name).toBe("惠民保");
  });
});

describe("buildCommercialInsuranceV5Report", () => {
  it("生成商保数据", () => {
    const r = buildCommercialInsuranceV5Report("30d");
    expect(r.commercial.directBilling).toBeGreaterThan(0);
  });

  it("生成惠民保数据", () => {
    const r = buildCommercialInsuranceV5Report("30d");
    expect(r.huimin.insured).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCommercialInsuranceV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
