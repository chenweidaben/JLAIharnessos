/**
 * 健澜科技 jlmedaios - 病案首页完整性校验 V14 单测（M535-A）
 *
 * 测试 buildHomepageComplete 构建首页完整性校验、checkHomepageComplete 首页完整性校验、buildHomepageCompleteReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHomepageComplete,
  buildHomepageCompleteReport,
  checkHomepageComplete,
  type HomepageCompleteInputV14,
} from "../../src/bff/aggregators/emrHomepageCompleteV14Aggregator";
import { emrHomepageCompleteV14Routes } from "../../src/bff/routes/emrHomepageCompleteV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildHomepageComplete 构建首页完整性校验", () => {
  // 手算：recordId='REC200', dept='心内科' → 正确构建
  it("recordId='REC200', dept='心内科' → 正确构建", () => {
    const check = buildHomepageComplete("REC200", "心内科");
    expect(check.recordId).toBe("REC200");
    expect(check.dept).toBe("心内科");
  });
});

describe("checkHomepageComplete 完整", () => {
  // 手算：{hasMainDiagnosis:true, hasMainSurgery:true, hasAdmissionDate:true, hasDischargeDate:true}
  // 手算：complete = 4 项都 true = true
  // 手算：missingCount = 0 项 false = 0
  it("{hasMainDiagnosis:true, hasMainSurgery:true, hasAdmissionDate:true, hasDischargeDate:true} → complete=true, missingCount=0", () => {
    const input: HomepageCompleteInputV14 = {
      hasMainDiagnosis: true,
      hasMainSurgery: true,
      hasAdmissionDate: true,
      hasDischargeDate: true,
    };
    const result = checkHomepageComplete(input);
    expect(result.complete).toBe(true);
    expect(result.missingCount).toBe(0);
  });
});

describe("checkHomepageComplete 缺2项", () => {
  // 手算：{hasMainDiagnosis:true, hasMainSurgery:false, hasAdmissionDate:true, hasDischargeDate:false}
  // 手算：complete = 4 项都 true = false（hasMainSurgery=false, hasDischargeDate=false）
  // 手算：missingCount = 2 项 false（hasMainSurgery + hasDischargeDate）
  it("{hasMainDiagnosis:true, hasMainSurgery:false, hasAdmissionDate:true, hasDischargeDate:false} → complete=false, missingCount=2", () => {
    const input: HomepageCompleteInputV14 = {
      hasMainDiagnosis: true,
      hasMainSurgery: false,
      hasAdmissionDate: true,
      hasDischargeDate: false,
    };
    const result = checkHomepageComplete(input);
    expect(result.complete).toBe(false);
    expect(result.missingCount).toBe(2);
  });
});

describe("buildHomepageCompleteReport 构建报告", () => {
  // 手算：{complete:false, missingCount:2}
  // 手算：透传 complete + missingCount
  it("{complete:false, missingCount:2} → 正确返回（透传）", () => {
    const report = buildHomepageCompleteReport({ complete: false, missingCount: 2 });
    expect(report.complete).toBe(false);
    expect(report.missingCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-homepage-complete auth:true", () => {
    const def = (emrHomepageCompleteV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-homepage-complete");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
