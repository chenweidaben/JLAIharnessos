/**
 * 健澜科技 jlmedaios - 医美口腔健康消费 V5 单测（M274-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAestheticSafetyV5,
  buildAestheticDentalV5Report,
  priceAestheticV5,
} from "../../src/bff/aggregators/aestheticDentalV5ReportAggregator";

describe("priceAestheticV5", () => {
  it("2项目会员→final=4800", () => {
    expect(priceAestheticV5(2, true).final).toBe(4800);
  });
});

describe("assessAestheticSafetyV5", () => {
  it("客户风险2→高风险不通过", () => {
    expect(assessAestheticSafetyV5(2, 0).ok).toBe(false);
  });
});

describe("buildAestheticDentalV5Report", () => {
  it("生成医美数据", () => {
    expect(buildAestheticDentalV5Report("30d").aesthetic.injection).toBeGreaterThan(0);
  });
  it("生成口腔数据", () => {
    expect(buildAestheticDentalV5Report("30d").dental.implant).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildAestheticDentalV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
