/**
 * 健澜科技 jlmedaios - 医保 V4 纯函数单测（M252-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessDRGGroupingV4,
  buildInsuranceV4Report,
  calculateInsuranceReimbursementV4,
} from "../../src/bff/aggregators/insuranceV4ReportAggregator";

describe("assessDRGGroupingV4", () => {
  it("有心梗+手术 → 外科组权重3.0", () => {
    expect(assessDRGGroupingV4("心梗", ["PCI"]).weight).toBe(3.0);
  });
});

describe("calculateInsuranceReimbursementV4", () => {
  it("总费用10000自付2000比例80%封顶8000 → 报销6400", () => {
    expect(calculateInsuranceReimbursementV4({ total: 10000, selfPay: 2000 }, { ratio: 0.8, cap: 8000 }).reimbursement).toBe(6400);
  });
});

describe("buildInsuranceV4Report", () => {
  it("生成政策数据", () => {
    const r = buildInsuranceV4Report("30d");
    expect(r.policy.employee).toBeGreaterThan(0);
  });

  it("生成 DRG 数据", () => {
    const r = buildInsuranceV4Report("30d");
    expect(r.drg.grouping).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInsuranceV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
