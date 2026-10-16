/**
 * 健澜科技 jlmedaios - 药房 V4 纯函数单测（M251-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAntibioticUseV4,
  buildPharmacyV4Report,
  reviewPrescriptionV4,
} from "../../src/bff/aggregators/pharmacyV4ReportAggregator";

describe("reviewPrescriptionV4", () => {
  it("65岁剂量>10 → 不通过", () => {
    expect(reviewPrescriptionV4({ drug: "X", dose: 15, frequency: "qd" }, { age: 65, renal: 90 }).approved).toBe(false);
  });
});

describe("assessAntibioticUseV4", () => {
  it("DDDs 30天数100 → 30达标", () => {
    expect(assessAntibioticUseV4(30, 100).target).toBe(true);
  });
});

describe("buildPharmacyV4Report", () => {
  it("生成门诊数据", () => {
    const r = buildPharmacyV4Report("30d");
    expect(r.outpatient.dispensing).toBeGreaterThan(0);
  });

  it("生成审核数据", () => {
    const r = buildPharmacyV4Report("30d");
    expect(r.review.rational).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPharmacyV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
