/**
 * 健澜科技 jlmedaios - 病历归档完整性校验 V14 单测（M533-B）
 *
 * 测试 buildArchiveIntegrity 构建完整性校验、verifyArchiveIntegrity 完整性校验、buildArchiveIntegrityReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildArchiveIntegrity,
  buildArchiveIntegrityReport,
  verifyArchiveIntegrity,
  type ArchiveIntegrityInputV14,
} from "../../src/bff/aggregators/emrArchiveIntegrityV14Aggregator";
import { emrArchiveIntegrityV14Routes } from "../../src/bff/routes/emrArchiveIntegrityV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildArchiveIntegrity 构建完整性校验", () => {
  // 手算：recordId='REC091', archiveDate='2026-10-01' → 正确构建
  it("recordId='REC091', archiveDate='2026-10-01' → 正确构建", () => {
    const integrity = buildArchiveIntegrity("REC091", "2026-10-01");
    expect(integrity.recordId).toBe("REC091");
    expect(integrity.archiveDate).toBe("2026-10-01");
  });
});

describe("verifyArchiveIntegrity 完整", () => {
  // 手算：{expectedFields=10, actualFields=10}
  // 手算：missingFields = 10 - 10 = 0
  // 手算：intact = missingFields === 0 = true
  it("{expectedFields=10, actualFields=10} → missingFields=0, intact=true", () => {
    const input: ArchiveIntegrityInputV14 = { expectedFields: 10, actualFields: 10 };
    const result = verifyArchiveIntegrity(input);
    expect(result.missingFields).toBe(0);
    expect(result.intact).toBe(true);
  });
});

describe("verifyArchiveIntegrity 缺3字段", () => {
  // 手算：{expectedFields=10, actualFields=7}
  // 手算：missingFields = 10 - 7 = 3
  // 手算：intact = missingFields === 0 = false
  it("{expectedFields=10, actualFields=7} → missingFields=3, intact=false", () => {
    const input: ArchiveIntegrityInputV14 = { expectedFields: 10, actualFields: 7 };
    const result = verifyArchiveIntegrity(input);
    expect(result.missingFields).toBe(3);
    expect(result.intact).toBe(false);
  });
});

describe("buildArchiveIntegrityReport 构建报告", () => {
  // 手算：{intact:false, missingFields:3}
  // 手算：透传 intact + missingFields
  it("{intact:false, missingFields:3} → 正确返回（透传）", () => {
    const report = buildArchiveIntegrityReport({ intact: false, missingFields: 3 });
    expect(report.intact).toBe(false);
    expect(report.missingFields).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive-integrity auth:true", () => {
    const def = (emrArchiveIntegrityV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive-integrity");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
