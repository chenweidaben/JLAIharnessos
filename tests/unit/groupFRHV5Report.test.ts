/**
 * 健澜科技 jlmedaios - 集团财务人力物资 V5 单测（M273-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildGroupFRHV5Report,
  centralizeProcurementV5,
  consolidateFinanceV5,
} from "../../src/bff/aggregators/groupFRHV5ReportAggregator";

describe("consolidateFinanceV5", () => {
  it("2子公司收入1000+2000成本500+1000→profit=1500", () => {
    const r = consolidateFinanceV5([{ name: "A", revenue: 1000, cost: 500 }, { name: "B", revenue: 2000, cost: 1000 }]);
    expect(r.totalRevenue).toBe(3000);
    expect(r.profit).toBe(1500);
  });
});

describe("centralizeProcurementV5", () => {
  it("集团集中100项→centralized=100 rate=100", () => {
    expect(centralizeProcurementV5(100, true).centralized).toBe(100);
    expect(centralizeProcurementV5(100, true).rate).toBe(100);
  });
});

describe("buildGroupFRHV5Report", () => {
  it("生成集团财务数据", () => {
    expect(buildGroupFRHV5Report("30d").finance.consolidatedReport).toBeGreaterThan(0);
  });
  it("生成集团人力数据", () => {
    expect(buildGroupFRHV5Report("30d").hr.establishment).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildGroupFRHV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
