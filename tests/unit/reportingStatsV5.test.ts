/**
 * 健澜科技 jlmedaios - 卫生健康统计与医改监测上报 V5 单测（M278-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReportingStatsV5Report,
  buildStatReportV5,
  diffReportV5,
  validateReportV5,
  type StatRecord,
} from "../../src/bff/aggregators/reportingStatsV5Aggregator";

const records: StatRecord[] = [
  { outpatientVolume: 1000, inpatientDays: 200, surgeryCount: 50, revenue: 500000 },
  { outpatientVolume: 800, inpatientDays: 150, surgeryCount: 30, revenue: 400000 },
];

describe("buildStatReportV5", () => {
  it("汇总两条记录", () => {
    const r = buildStatReportV5(records, "2026Q3");
    expect(r.outpatientVolume).toBe(1800);
    expect(r.revenue).toBe(900000);
  });
});

describe("validateReportV5", () => {
  it("正常报表→校验通过", () => {
    expect(validateReportV5(buildStatReportV5(records, "2026Q3")).valid).toBe(true);
  });
  it("门诊量为0→报缺项", () => {
    const bad = buildStatReportV5([{ outpatientVolume: 0, inpatientDays: 200, surgeryCount: 50, revenue: 100 }], "2026Q3");
    expect(validateReportV5(bad).issues.length).toBeGreaterThan(0);
  });
});

describe("diffReportV5", () => {
  it("门诊量不一致→返回差异", () => {
    const local = buildStatReportV5(records, "2026Q3");
    const submitted = buildStatReportV5([records[0]], "2026Q3");
    expect(diffReportV5(local, submitted).length).toBeGreaterThan(0);
  });
});

describe("buildReportingStatsV5Report", () => {
  it("按状态统计", () => {
    const r = buildReportingStatsV5Report([
      { status: "submitted", valid: true },
      { status: "draft", valid: false },
    ]);
    expect(r.submittedCount).toBe(1);
    expect(r.pendingValidation).toBe(1);
  });
});
