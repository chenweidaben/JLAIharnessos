/**
 * 健澜科技 jlmedaios - 运行病历质控 V14 单测（M481-A）
 *
 * 测试 buildRunningQc 构建、checkRunningTimeliness 时限检查、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRunningQc,
  checkRunningTimeliness,
  type RunningQcV14,
} from "../../src/bff/aggregators/emrRunningQcV14Aggregator";
import { emrRunningQcV14Routes } from "../../src/bff/routes/emrRunningQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRunningQc 构建", () => {
  // 手算：medicalRecordId='MR001', patientName='张三', dept='内科' → 正确构建
  it("medicalRecordId=MR001, patientName=张三, dept=内科 → 正确构建", () => {
    const record: RunningQcV14 = buildRunningQc("MR001", "张三", "内科");
    expect(record.medicalRecordId).toBe("MR001");
    expect(record.patientName).toBe("张三");
    expect(record.dept).toBe("内科");
  });
});

describe("checkRunningTimeliness 未超时", () => {
  // 手算：hoursSinceLastUpdate=20, maxHours=24 → 20<=24 → overdue=false
  it("hoursSinceLastUpdate=20, maxHours=24 → overdue=false", () => {
    const result = checkRunningTimeliness(20, 24);
    expect(result.overdue).toBe(false);
  });
});

describe("checkRunningTimeliness 超时", () => {
  // 手算：hoursSinceLastUpdate=30, maxHours=24 → 30>24 → overdue=true, overdueHours=30-24=6
  it("hoursSinceLastUpdate=30, maxHours=24 → overdue=true, overdueHours=6", () => {
    const result = checkRunningTimeliness(30, 24);
    expect(result.overdue).toBe(true);
    expect(result.overdueHours).toBe(6);
  });
});

describe("checkRunningTimeliness 边界", () => {
  // 手算：hoursSinceLastUpdate=24, maxHours=24 → 24<=24 → overdue=false
  it("hoursSinceLastUpdate=24, maxHours=24 → overdue=false", () => {
    const result = checkRunningTimeliness(24, 24);
    expect(result.overdue).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-running-qc auth:true", () => {
    const def = (emrRunningQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-running-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
