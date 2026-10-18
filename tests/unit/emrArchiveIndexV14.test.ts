/**
 * 健澜科技 jlmedaios - 病历归档索引 V14 单测（M533-C）
 *
 * 测试 buildArchiveIndex 构建归档索引、buildArchiveIndexEntry 索引条目构建、buildArchiveIndexReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildArchiveIndex,
  buildArchiveIndexEntry,
  buildArchiveIndexReport,
  type ArchiveIndexEntryInputV14,
} from "../../src/bff/aggregators/emrArchiveIndexV14Aggregator";
import { emrArchiveIndexV14Routes } from "../../src/bff/routes/emrArchiveIndexV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildArchiveIndex 构建归档索引", () => {
  // 手算：dept='心内科', year=2026 → 正确构建
  it("dept='心内科', year=2026 → 正确构建", () => {
    const index = buildArchiveIndex("心内科", 2026);
    expect(index.dept).toBe("心内科");
    expect(index.year).toBe(2026);
  });
});

describe("buildArchiveIndexEntry 正常", () => {
  // 手算：{recordId='REC092', patientName='张三', archiveDate='2026-09-15'}
  // 手算：indexKey = recordId = 'REC092'
  // 手算：indexValue = '张三' + '|' + '2026-09-15' = '张三|2026-09-15'
  it("{recordId='REC092', patientName='张三', archiveDate='2026-09-15'} → indexKey='REC092', indexValue='张三|2026-09-15'", () => {
    const input: ArchiveIndexEntryInputV14 = {
      recordId: "REC092",
      patientName: "张三",
      archiveDate: "2026-09-15",
    };
    const entry = buildArchiveIndexEntry(input);
    expect(entry.indexKey).toBe("REC092");
    expect(entry.indexValue).toBe("张三|2026-09-15");
  });
});

describe("buildArchiveIndexEntry 另一病历", () => {
  // 手算：{recordId='REC093', patientName='李四', archiveDate='2026-09-20'}
  // 手算：indexKey = 'REC093'
  // 手算：indexValue = '李四' + '|' + '2026-09-20' = '李四|2026-09-20'
  it("{recordId='REC093', patientName='李四', archiveDate='2026-09-20'} → indexKey='REC093', indexValue='李四|2026-09-20'", () => {
    const input: ArchiveIndexEntryInputV14 = {
      recordId: "REC093",
      patientName: "李四",
      archiveDate: "2026-09-20",
    };
    const entry = buildArchiveIndexEntry(input);
    expect(entry.indexKey).toBe("REC093");
    expect(entry.indexValue).toBe("李四|2026-09-20");
  });
});

describe("buildArchiveIndexReport 构建报告", () => {
  // 手算：{entryCount=50}
  // 手算：透传 entryCount
  it("{entryCount=50} → 正确返回（透传）", () => {
    const report = buildArchiveIndexReport({ entryCount: 50 });
    expect(report.entryCount).toBe(50);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive-index auth:true", () => {
    const def = (emrArchiveIndexV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive-index");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
