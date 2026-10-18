/**
 * 健澜科技 jlmedaios - 病历自动归档检查 V14 单测（M533-A）
 *
 * 测试 buildArchiveCheck 构建归档检查、checkArchiveReadiness 归档就绪检查、buildArchiveCheckReport 构建报告、读路由 GET auth:true。
 * 命名空间与 M527-C emrArchiveAutoCheckV14 区分，本模块专注归档就绪检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildArchiveCheck,
  buildArchiveCheckReport,
  checkArchiveReadiness,
  type ArchiveCheckInputV14,
} from "../../src/bff/aggregators/emrArchiveCheckV14Aggregator";
import { emrArchiveCheckV14Routes } from "../../src/bff/routes/emrArchiveCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildArchiveCheck 构建归档检查", () => {
  // 手算：recordId='REC090', dept='心内科' → 正确构建
  it("recordId='REC090', dept='心内科' → 正确构建", () => {
    const check = buildArchiveCheck("REC090", "心内科");
    expect(check.recordId).toBe("REC090");
    expect(check.dept).toBe("心内科");
  });
});

describe("checkArchiveReadiness 就绪", () => {
  // 手算：{hasDischargeSummary:true, hasSignature:true, hasPayment:true}
  // 手算：ready = 3 项都 true = true
  // 手算：missingCount = 0 项 false = 0
  it("{hasDischargeSummary:true, hasSignature:true, hasPayment:true} → ready=true, missingCount=0", () => {
    const input: ArchiveCheckInputV14 = {
      hasDischargeSummary: true,
      hasSignature: true,
      hasPayment: true,
    };
    const result = checkArchiveReadiness(input);
    expect(result.ready).toBe(true);
    expect(result.missingCount).toBe(0);
  });
});

describe("checkArchiveReadiness 缺2项", () => {
  // 手算：{hasDischargeSummary:true, hasSignature:false, hasPayment:false}
  // 手算：ready = 3 项都 true = false（hasSignature=false, hasPayment=false）
  // 手算：missingCount = 2 项 false（hasSignature + hasPayment）
  it("{hasDischargeSummary:true, hasSignature:false, hasPayment:false} → ready=false, missingCount=2", () => {
    const input: ArchiveCheckInputV14 = {
      hasDischargeSummary: true,
      hasSignature: false,
      hasPayment: false,
    };
    const result = checkArchiveReadiness(input);
    expect(result.ready).toBe(false);
    expect(result.missingCount).toBe(2);
  });
});

describe("buildArchiveCheckReport 构建报告", () => {
  // 手算：{ready:false, missingCount:2}
  // 手算：透传 ready + missingCount
  it("{ready:false, missingCount:2} → 正确返回（透传）", () => {
    const report = buildArchiveCheckReport({ ready: false, missingCount: 2 });
    expect(report.ready).toBe(false);
    expect(report.missingCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive-check auth:true", () => {
    const def = (emrArchiveCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
