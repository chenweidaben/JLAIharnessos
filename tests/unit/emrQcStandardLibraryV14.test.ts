/**
 * 健澜科技 jlmedaios - 质控行业标准库 V14 单测（M520-C）
 *
 * 测试 buildStandardLibrary 构建标准库、searchStandards 搜索标准、buildStandardLibraryReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStandardLibrary,
  buildStandardLibraryReport,
  searchStandards,
  type StandardV14,
} from "../../src/bff/aggregators/emrQcStandardLibraryV14Aggregator";
import { emrQcStandardLibraryV14Routes } from "../../src/bff/routes/emrQcStandardLibraryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStandardLibrary 构建标准库", () => {
  // 手算：category='国家规范', totalStandards=45 → 正确构建
  it("category='国家规范', totalStandards=45 → 正确构建", () => {
    const library = buildStandardLibrary("国家规范", 45);
    expect(library.category).toBe("国家规范");
    expect(library.totalStandards).toBe(45);
  });
});

describe("searchStandards 单匹配", () => {
  // 手算：query='病历'
  // 手算：standards=[{id:'S001',title:'病历书写基本规范',issuer:'卫健委'},{id:'S002',title:'医院评审标准',issuer:'卫健委'}]
  // 手算：仅 S001 的 title 含'病历'子串 → matched 含 S001, count=1
  it("query='病历', standards=[{id:'S001',title:'病历书写基本规范',issuer:'卫健委'},{id:'S002',title:'医院评审标准',issuer:'卫健委'}] → matched 含 S001, count=1", () => {
    const standards: StandardV14[] = [
      { id: "S001", title: "病历书写基本规范", issuer: "卫健委" },
      { id: "S002", title: "医院评审标准", issuer: "卫健委" },
    ];
    const result = searchStandards("病历", standards);
    expect(result.matched).toContainEqual({ id: "S001", title: "病历书写基本规范" });
    expect(result.count).toBe(1);
  });
});

describe("searchStandards 多匹配", () => {
  // 手算：query='卫健委'
  // 手算：standards=[{id:'S001',title:'病历书写基本规范',issuer:'卫健委'},{id:'S002',title:'医院评审标准',issuer:'卫健委'}]
  // 手算：两项 issuer 都含'卫健委'子串 → matched 含两项, count=2
  it("query='卫健委', standards=[{id:'S001',title:'病历书写基本规范',issuer:'卫健委'},{id:'S002',title:'医院评审标准',issuer:'卫健委'}] → matched 含两项, count=2", () => {
    const standards: StandardV14[] = [
      { id: "S001", title: "病历书写基本规范", issuer: "卫健委" },
      { id: "S002", title: "医院评审标准", issuer: "卫健委" },
    ];
    const result = searchStandards("卫健委", standards);
    expect(result.matched.length).toBe(2);
    expect(result.count).toBe(2);
  });
});

describe("buildStandardLibraryReport 构建报告", () => {
  // 手算：{matched:[{id:'S001',title:'病历书写基本规范'},{id:'S002',title:'医院评审标准'}], count=2} → firstStandard=第一项 title='病历书写基本规范'
  it("{matched:[{id:'S001',title:'病历书写基本规范'},{id:'S002',title:'医院评审标准'}], count=2} → firstStandard='病历书写基本规范'", () => {
    const report = buildStandardLibraryReport({
      matched: [
        { id: "S001", title: "病历书写基本规范" },
        { id: "S002", title: "医院评审标准" },
      ],
      count: 2,
    });
    expect(report.firstStandard).toBe("病历书写基本规范");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-standard-library auth:true", () => {
    const def = (emrQcStandardLibraryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-standard-library");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
