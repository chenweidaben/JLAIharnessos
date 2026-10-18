/**
 * 健澜科技 jlmedaios - 病历临床路径符合性检查 V14 单测（M537-B）
 *
 * 测试 buildPathwayCheck 构建路径检查、checkPathwayCompliance 路径符合性检查、buildPathwayCheckReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPathwayCheck,
  buildPathwayCheckReport,
  checkPathwayCompliance,
  type PathwayCheckInputV14,
} from "../../src/bff/aggregators/emrPathwayCheckV14Aggregator";
import { emrPathwayCheckV14Routes } from "../../src/bff/routes/emrPathwayCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPathwayCheck 构建路径检查", () => {
  // 手算：recordId='REC401', pathwayName='急性心梗路径' → 正确构建
  it("recordId='REC401', pathwayName='急性心梗路径' → 正确构建", () => {
    const check = buildPathwayCheck("REC401", "急性心梗路径");
    expect(check.recordId).toBe("REC401");
    expect(check.pathwayName).toBe("急性心梗路径");
  });
});

describe("checkPathwayCompliance 符合", () => {
  // 手算：{expectedSteps=10, actualSteps=9, deviationDays=1}
  // 手算：complianceRate = Math.round((1 - |9-10|/10) * 1000) / 10
  // 手算：= Math.round((1 - 0.1) * 1000) / 10 = Math.round(900) / 10 = 900 / 10 = 90.0
  // 手算：compliant = 90.0 >= 80 && 1 <= 2 → true
  it("{expectedSteps=10, actualSteps=9, deviationDays=1} → compliant=true, complianceRate=90.0", () => {
    const input: PathwayCheckInputV14 = { expectedSteps: 10, actualSteps: 9, deviationDays: 1 };
    const result = checkPathwayCompliance(input);
    expect(result.compliant).toBe(true);
    expect(result.complianceRate).toBeCloseTo(90.0, 1);
  });
});

describe("checkPathwayCompliance 不符合", () => {
  // 手算：{expectedSteps=10, actualSteps=6, deviationDays=3}
  // 手算：complianceRate = Math.round((1 - |6-10|/10) * 1000) / 10
  // 手算：= Math.round((1 - 0.4) * 1000) / 10 = Math.round(600) / 10 = 600 / 10 = 60.0
  // 手算：compliant = 60.0 >= 80? false → false
  it("{expectedSteps=10, actualSteps=6, deviationDays=3} → compliant=false, complianceRate=60.0", () => {
    const input: PathwayCheckInputV14 = { expectedSteps: 10, actualSteps: 6, deviationDays: 3 };
    const result = checkPathwayCompliance(input);
    expect(result.compliant).toBe(false);
    expect(result.complianceRate).toBeCloseTo(60.0, 1);
  });
});

describe("buildPathwayCheckReport 构建报告", () => {
  // 手算：{compliant=true, complianceRate=90.0}
  // 手算：透传 compliant + complianceRate
  it("{compliant=true, complianceRate=90.0} → 正确返回（透传）", () => {
    const report = buildPathwayCheckReport({ compliant: true, complianceRate: 90.0 });
    expect(report.compliant).toBe(true);
    expect(report.complianceRate).toBe(90.0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-pathway-check auth:true", () => {
    const def = (emrPathwayCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-pathway-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
