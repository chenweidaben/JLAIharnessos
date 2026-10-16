/**
 * 健澜科技 jlmedaios - 后勤保障 V3 纯函数单测（M243-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessLogisticsEfficiencyV3,
  buildLogisticsV3Report,
  calculateEnergyV3,
} from "../../src/bff/aggregators/logisticsV3ReportAggregator";

describe("assessLogisticsEfficiencyV3", () => {
  it("响应10分钟完成率98% → 优秀", () => {
    expect(assessLogisticsEfficiencyV3(10, 98).excellent).toBe(true);
  });
});

describe("calculateEnergyV3", () => {
  it("面积10000用电500000 → 50度/㎡", () => {
    expect(calculateEnergyV3(10000, { kwh: 500000, water: 100000, gas: 5000 }).kwhPerSqm).toBe(50);
  });
});

describe("buildLogisticsV3Report", () => {
  it("生成物业数据", () => {
    const r = buildLogisticsV3Report("30d");
    expect(r.property.parking).toBeGreaterThan(0);
  });

  it("生成立项数据", () => {
    const r = buildLogisticsV3Report("30d");
    expect(r.utility.power).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildLogisticsV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
