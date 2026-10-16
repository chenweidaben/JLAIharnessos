/**
 * 健澜科技 jlmedaios - 健康体检中心智能化 V5 单测（M274-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHealthCheckupV5Report,
  interpretReportV5,
  recommendCheckupV5,
} from "../../src/bff/aggregators/healthCheckupV5ReportAggregator";

describe("recommendCheckupV5", () => {
  it("55岁→VIP套餐", () => {
    expect(recommendCheckupV5(55, "男", 0).package).toBe("VIP套餐");
  });
});

describe("interpretReportV5", () => {
  it("异常3+既往3=6→高风险", () => {
    expect(interpretReportV5(3, 3).riskLevel).toBe("高风险");
  });
});

describe("buildHealthCheckupV5Report", () => {
  it("生成套餐数据", () => {
    expect(buildHealthCheckupV5Report("30d").packageMgmt.basic).toBeGreaterThan(0);
  });
  it("生成检中数据", () => {
    expect(buildHealthCheckupV5Report("30d").inProcess.blood).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildHealthCheckupV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
