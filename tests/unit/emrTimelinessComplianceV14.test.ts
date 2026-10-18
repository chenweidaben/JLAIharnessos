/**
 * 健澜科技 jlmedaios - 病历时效合规检查 V14 单测（M485-D，M485 收官）
 *
 * 测试 checkTimelinessCompliance 检查、buildTimelinessReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkTimelinessCompliance,
  buildTimelinessReport,
  type TimelinessComplianceResultV14,
} from "../../src/bff/aggregators/emrTimelinessComplianceV14Aggregator";
import { emrTimelinessComplianceV14Routes } from "../../src/bff/routes/emrTimelinessComplianceV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkTimelinessCompliance 1条超时", () => {
  // 手算：3 条记录，1 条超时 → overdueCount=1
  it("3 条记录，1 条超时 → overdueCount=1", () => {
    const records = [
      { name: "入院记录", deadlineHours: 24, actualHours: 20 },
      { name: "首次病程", deadlineHours: 8, actualHours: 12 },
      { name: "出院小结", deadlineHours: 48, actualHours: 36 },
    ];
    const result: TimelinessComplianceResultV14 = checkTimelinessCompliance(records);
    expect(result.overdueCount).toBe(1);
  });
});

describe("checkTimelinessCompliance 全合规", () => {
  // 手算：3 条全合规 → overdueCount=0
  it("3 条全合规 → overdueCount=0", () => {
    const records = [
      { name: "入院记录", deadlineHours: 24, actualHours: 20 },
      { name: "首次病程", deadlineHours: 8, actualHours: 6 },
      { name: "出院小结", deadlineHours: 48, actualHours: 36 },
    ];
    const result: TimelinessComplianceResultV14 = checkTimelinessCompliance(records);
    expect(result.overdueCount).toBe(0);
  });
});

describe("buildTimelinessReport 2/3", () => {
  // 手算：compliantCount=2, total=3 → 2/3×100=66.67 → Math.ceil=67
  it("compliantCount=2, total=3 → compliantRate=67", () => {
    const result: TimelinessComplianceResultV14 = {
      records: [],
      overdueCount: 1,
      compliantCount: 2,
      total: 3,
    };
    const report = buildTimelinessReport(result);
    expect(report.compliantRate).toBe(67);
  });
});

describe("buildTimelinessReport 3/3", () => {
  // 手算：compliantCount=3, total=3 → 3/3×100=100
  it("compliantCount=3, total=3 → compliantRate=100", () => {
    const result: TimelinessComplianceResultV14 = {
      records: [],
      overdueCount: 0,
      compliantCount: 3,
      total: 3,
    };
    const report = buildTimelinessReport(result);
    expect(report.compliantRate).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-timeliness-compliance auth:true", () => {
    const def = (emrTimelinessComplianceV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-timeliness-compliance");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
