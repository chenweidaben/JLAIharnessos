/**
 * 健澜科技 jlmedaios - 病历诊断完整性检查 V14 单测（M537-D）
 *
 * 测试 buildDiagnosisComplete 构建诊断检查、checkDiagnosisComplete 诊断完整性检查、buildDiagnosisCompleteReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDiagnosisComplete,
  buildDiagnosisCompleteReport,
  checkDiagnosisComplete,
  type DiagnosisCompleteInputV14,
} from "../../src/bff/aggregators/emrDiagnosisCompleteV14Aggregator";
import { emrDiagnosisCompleteV14Routes } from "../../src/bff/routes/emrDiagnosisCompleteV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDiagnosisComplete 构建诊断检查", () => {
  // 手算：recordId='REC403', dept='神经内科' → 正确构建
  it("recordId='REC403', dept='神经内科' → 正确构建", () => {
    const check = buildDiagnosisComplete("REC403", "神经内科");
    expect(check.recordId).toBe("REC403");
    expect(check.dept).toBe("神经内科");
  });
});

describe("checkDiagnosisComplete 完整", () => {
  // 手算：{hasMainDiagnosis:true, hasSecondaryDiagnosis:true, hasDiagnosisCode:true}
  // 手算：complete = 3 项都 true = true
  // 手算：missingCount = 0 项 false = 0
  it("{hasMainDiagnosis:true, hasSecondaryDiagnosis:true, hasDiagnosisCode:true} → complete=true, missingCount=0", () => {
    const input: DiagnosisCompleteInputV14 = {
      hasMainDiagnosis: true,
      hasSecondaryDiagnosis: true,
      hasDiagnosisCode: true,
    };
    const result = checkDiagnosisComplete(input);
    expect(result.complete).toBe(true);
    expect(result.missingCount).toBe(0);
  });
});

describe("checkDiagnosisComplete 缺2项", () => {
  // 手算：{hasMainDiagnosis:true, hasSecondaryDiagnosis:false, hasDiagnosisCode:false}
  // 手算：complete = 3 项都 true = false（hasSecondaryDiagnosis=false, hasDiagnosisCode=false）
  // 手算：missingCount = 2 项 false（hasSecondaryDiagnosis + hasDiagnosisCode）
  it("{hasMainDiagnosis:true, hasSecondaryDiagnosis:false, hasDiagnosisCode:false} → complete=false, missingCount=2", () => {
    const input: DiagnosisCompleteInputV14 = {
      hasMainDiagnosis: true,
      hasSecondaryDiagnosis: false,
      hasDiagnosisCode: false,
    };
    const result = checkDiagnosisComplete(input);
    expect(result.complete).toBe(false);
    expect(result.missingCount).toBe(2);
  });
});

describe("buildDiagnosisCompleteReport 构建报告", () => {
  // 手算：{complete:false, missingCount:2}
  // 手算：透传 complete + missingCount
  it("{complete:false, missingCount:2} → 正确返回（透传）", () => {
    const report = buildDiagnosisCompleteReport({ complete: false, missingCount: 2 });
    expect(report.complete).toBe(false);
    expect(report.missingCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-diagnosis-complete auth:true", () => {
    const def = (emrDiagnosisCompleteV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-diagnosis-complete");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
