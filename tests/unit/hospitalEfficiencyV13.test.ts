/**
 * 健澜科技 jlmedaios - 医院运营效率 V13 单测（M322-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientTurnoverDaysV13,
  computeOutpatientWaitTimeV13,
  computeReportTimelinessRateV13,
  type InpatientStayV13,
  type OutpatientWaitV13,
  type ReportItemV13,
} from "../../src/bff/aggregators/hospitalEfficiencyV13Aggregator";
import { hospitalEfficiencyV13Routes } from "../../src/bff/routes/hospitalEfficiencyV13";

const outpatientData: OutpatientWaitV13[] = [
  { recordId: "o1", waitMinutes: 15 },
  { recordId: "o2", waitMinutes: 20 },
  { recordId: "o3", waitMinutes: 10 },
  { recordId: "o4", waitMinutes: 25 },
  { recordId: "o5", waitMinutes: 30 },
];

const inpatientData: InpatientStayV13[] = [
  { recordId: "i1", stayDays: 5 },
  { recordId: "i2", stayDays: 6 },
  { recordId: "i3", stayDays: 4 },
  { recordId: "i4", stayDays: 7 },
  { recordId: "i5", stayDays: 8 },
];

const reports: ReportItemV13[] = [
  { reportId: "r1", isTimely: true },
  { reportId: "r2", isTimely: true },
  { reportId: "r3", isTimely: true },
  { reportId: "r4", isTimely: true },
  { reportId: "r5", isTimely: true },
  { reportId: "r6", isTimely: true },
  { reportId: "r7", isTimely: true },
  { reportId: "r8", isTimely: true },
  { reportId: "r9", isTimely: true },
  { reportId: "r10", isTimely: false },
];

describe("computeOutpatientWaitTimeV13", () => {
  // 算式：(15+20+10+25+30)/5 = 100/5 = 20
  it("mean wait = 20 分钟", () => {
    expect(computeOutpatientWaitTimeV13(outpatientData)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientWaitTimeV13([])).toBe(0);
  });
});

describe("computeInpatientTurnoverDaysV13", () => {
  // 算式：(5+6+4+7+8)/5 = 30/5 = 6
  it("mean turnover = 6 天", () => {
    expect(computeInpatientTurnoverDaysV13(inpatientData)).toBe(6);
  });
});

describe("computeReportTimelinessRateV13", () => {
  // 算式：9/10×100 = 90
  it("timeliness = 90%", () => {
    expect(computeReportTimelinessRateV13(reports)).toBe(90);
  });
});

describe("hospitalEfficiencyV13Routes 读路由", () => {
  it("GET /api/v1/hospital-efficiency 路由存在且 auth:true", () => {
    const route = hospitalEfficiencyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hospital-efficiency",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
