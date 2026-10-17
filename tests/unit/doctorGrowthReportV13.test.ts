/**
 * 健澜科技 jlmedaios - 医生个人月度成长报告 V13 单测（M310-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMonthlyGrowthReportV13,
  computeMoMGrowthV13,
  identifyGrowthMilestoneV13,
  type MonthlyGrowthDataV13,
} from "../../src/bff/aggregators/doctorGrowthReportV13Aggregator";
import { doctorGrowthReportV13Routes } from "../../src/bff/routes/doctorGrowthReportV13";

const monthData: MonthlyGrowthDataV13 = {
  tasksDone: 12,
  suggestionsAdopted: 8,
  sopReferences: 5,
  badgeDelta: 1,
};

describe("buildMonthlyGrowthReportV13", () => {
  it("返回 doctorId + month + 四指标", () => {
    const r = buildMonthlyGrowthReportV13("d1", "2026-10", monthData);
    expect(r.doctorId).toBe("d1");
    expect(r.month).toBe("2026-10");
    expect(r.tasksDone).toBe(12);
    expect(r.suggestionsAdopted).toBe(8);
  });
});

describe("computeMoMGrowthV13", () => {
  // 算式：this=70 - last=50 = 20
  it("70 - 50 = +20pp", () => {
    expect(computeMoMGrowthV13(70, 50)).toBe(20);
  });
  it("空态（this=0, last=0）→ 0", () => {
    expect(computeMoMGrowthV13(0, 0)).toBe(0);
  });
});

describe("identifyGrowthMilestoneV13", () => {
  // 算式：momGrowth=20，>20 为显著，20 不 >20 → 平稳
  it("20 → 平稳（未超 20）", () => {
    expect(identifyGrowthMilestoneV13(20)).toBe("平稳");
  });
  // 算式：momGrowth=25 > 20 → 本月成长显著
  it("25 → 本月成长显著", () => {
    expect(identifyGrowthMilestoneV13(25)).toBe("本月成长显著");
  });
});

describe("doctorGrowthReportV13Routes 读路由", () => {
  it("GET /api/v1/doctor-growth-report 路由存在且 auth:true", () => {
    const route = doctorGrowthReportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/doctor-growth-report",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
