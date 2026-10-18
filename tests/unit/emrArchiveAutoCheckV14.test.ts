/**
 * 健澜科技 jlmedaios - 病历归档自动检查 V14 单测（M527-C）
 *
 * 测试 buildArchiveAutoCheck 构建检查、checkBeforeArchive 归档前检查、buildArchiveAutoCheckReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildArchiveAutoCheck,
  buildArchiveAutoCheckReport,
  checkBeforeArchive,
  type ArchiveAutoCheckInputV14,
} from "../../src/bff/aggregators/emrArchiveAutoCheckV14Aggregator";
import { emrArchiveAutoCheckV14Routes } from "../../src/bff/routes/emrArchiveAutoCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildArchiveAutoCheck 构建检查", () => {
  // 手算：recordId='REC045', dept='心内科' → 正确构建
  it("recordId='REC045', dept='心内科' → 正确构建", () => {
    const check = buildArchiveAutoCheck("REC045", "心内科");
    expect(check.recordId).toBe("REC045");
    expect(check.dept).toBe("心内科");
  });
});

describe("checkBeforeArchive 可归档", () => {
  // 手算：{hasDischargeSummary:true, hasSignature:true, hasPayment:true}
  // 手算：3 项都 true → missingItems=[]
  // 手算：canArchive = missingItems.length === 0 = true
  it("{hasDischargeSummary:true, hasSignature:true, hasPayment:true} → canArchive=true, missingItems=[]", () => {
    const input: ArchiveAutoCheckInputV14 = {
      hasDischargeSummary: true,
      hasSignature: true,
      hasPayment: true,
    };
    const result = checkBeforeArchive(input);
    expect(result.canArchive).toBe(true);
    expect(result.missingItems).toEqual([]);
  });
});

describe("checkBeforeArchive 缺项", () => {
  // 手算：{hasDischargeSummary:true, hasSignature:false, hasPayment:false}
  // 手算：hasDischargeSummary=true → 不缺
  // 手算：hasSignature=false → missingItems.push('缺签名')
  // 手算：hasPayment=false → missingItems.push('缺费用结算')
  // 手算：missingItems=['缺签名','缺费用结算'] → canArchive=false
  it("{hasDischargeSummary:true, hasSignature:false, hasPayment:false} → canArchive=false, missingItems 包含'缺签名'和'缺费用结算'", () => {
    const input: ArchiveAutoCheckInputV14 = {
      hasDischargeSummary: true,
      hasSignature: false,
      hasPayment: false,
    };
    const result = checkBeforeArchive(input);
    expect(result.canArchive).toBe(false);
    expect(result.missingItems).toContain("缺签名");
    expect(result.missingItems).toContain("缺费用结算");
    expect(result.missingItems.length).toBe(2);
  });
});

describe("buildArchiveAutoCheckReport 构建报告", () => {
  // 手算：{canArchive:false, missingCount:2}
  // 手算：透传 canArchive + missingCount
  it("{canArchive:false, missingCount:2} → 正确返回（透传）", () => {
    const report = buildArchiveAutoCheckReport({ canArchive: false, missingCount: 2 });
    expect(report.canArchive).toBe(false);
    expect(report.missingCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive-auto-check auth:true", () => {
    const def = (emrArchiveAutoCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive-auto-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
