/**
 * 健澜科技 jlmedaios - 病历归档检索 V14 单测（M533-D，M533 收官）
 *
 * 测试 buildArchiveSearch 构建归档检索、searchArchiveRecords 归档检索、buildArchiveSearchReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildArchiveSearch,
  buildArchiveSearchReport,
  searchArchiveRecords,
  type ArchiveSearchInputV14,
} from "../../src/bff/aggregators/emrArchiveSearchV14Aggregator";
import { emrArchiveSearchV14Routes } from "../../src/bff/routes/emrArchiveSearchV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildArchiveSearch 构建归档检索", () => {
  // 手算：dept='心内科', year=2026 → 正确构建
  it("dept='心内科', year=2026 → 正确构建", () => {
    const search = buildArchiveSearch("心内科", 2026);
    expect(search.dept).toBe("心内科");
    expect(search.year).toBe(2026);
  });
});

describe("searchArchiveRecords 多匹配", () => {
  // 手算：query='张'
  // 手算：records = [{id:'R1',patientName:'张三',dept:'心内科'},{id:'R2',patientName:'李四',dept:'心内科'},{id:'R3',patientName:'张五',dept:'呼吸科'}]
  // 手算：张三/心内科 → patientName 含'张' → 匹配
  // 手算：李四/心内科 → patientName 不含'张'，dept 不含'张' → 不匹配
  // 手算：张五/呼吸科 → patientName 含'张' → 匹配
  // 手算：matchedCount = 2（张三 + 张五）
  // 手算：firstMatch = matched[0].patientName = '张三'
  it("{query='张', records=[张三/心内科, 李四/心内科, 张五/呼吸科]} → matchedCount=2, firstMatch='张三'", () => {
    const input: ArchiveSearchInputV14 = {
      query: "张",
      records: [
        { id: "R1", patientName: "张三", dept: "心内科" },
        { id: "R2", patientName: "李四", dept: "心内科" },
        { id: "R3", patientName: "张五", dept: "呼吸科" },
      ],
    };
    const result = searchArchiveRecords(input);
    expect(result.matchedCount).toBe(2);
    expect(result.firstMatch).toBe("张三");
  });
});

describe("searchArchiveRecords 无匹配", () => {
  // 手算：query='王'
  // 手算：records = [{id:'R1',patientName:'张三',dept:'心内科'},{id:'R2',patientName:'李四',dept:'心内科'}]
  // 手算：张三/心内科 → 不含'王'，dept 不含'王' → 不匹配
  // 手算：李四/心内科 → 不含'王'，dept 不含'王' → 不匹配
  // 手算：matchedCount = 0
  // 手算：firstMatch = '无匹配'
  it("{query='王', records=[张三/心内科, 李四/心内科]} → matchedCount=0, firstMatch='无匹配'", () => {
    const input: ArchiveSearchInputV14 = {
      query: "王",
      records: [
        { id: "R1", patientName: "张三", dept: "心内科" },
        { id: "R2", patientName: "李四", dept: "心内科" },
      ],
    };
    const result = searchArchiveRecords(input);
    expect(result.matchedCount).toBe(0);
    expect(result.firstMatch).toBe("无匹配");
  });
});

describe("buildArchiveSearchReport 构建报告", () => {
  // 手算：{matchedCount:2, firstMatch:'张三'}
  // 手算：透传 matchedCount + firstMatch
  it("{matchedCount:2, firstMatch:'张三'} → 正确返回（透传）", () => {
    const report = buildArchiveSearchReport({ matchedCount: 2, firstMatch: "张三" });
    expect(report.matchedCount).toBe(2);
    expect(report.firstMatch).toBe("张三");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive-search auth:true", () => {
    const def = (emrArchiveSearchV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive-search");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
