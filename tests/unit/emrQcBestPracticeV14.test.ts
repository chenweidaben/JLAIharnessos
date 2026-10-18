/**
 * 健澜科技 jlmedaios - 质控最佳实践库 V14 单测（M520-D，M520 收官）
 *
 * 测试 buildBestPractice 构建实践库、searchBestPractices 搜索实践、buildBestPracticeReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBestPractice,
  buildBestPracticeReport,
  searchBestPractices,
  type BestPracticeItemV14,
} from "../../src/bff/aggregators/emrQcBestPracticeV14Aggregator";
import { emrQcBestPracticeV14Routes } from "../../src/bff/routes/emrQcBestPracticeV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildBestPractice 构建实践库", () => {
  // 手算：category='三甲医院实践', totalPractices=30 → 正确构建
  it("category='三甲医院实践', totalPractices=30 → 正确构建", () => {
    const library = buildBestPractice("三甲医院实践", 30);
    expect(library.category).toBe("三甲医院实践");
    expect(library.totalPractices).toBe(30);
  });
});

describe("searchBestPractices 单匹配", () => {
  // 手算：query='质控'
  // 手算：practices=[{id:'P001',title:'智能质控系统实践',hospital:'浙一医院'},{id:'P002',title:'日间手术管理',hospital:'邵逸夫医院'}]
  // 手算：仅 P001 的 title 含'质控'子串 → matched 含 P001, count=1
  it("query='质控', practices=[{id:'P001',title:'智能质控系统实践',hospital:'浙一医院'},{id:'P002',title:'日间手术管理',hospital:'邵逸夫医院'}] → matched 含 P001, count=1", () => {
    const practices: BestPracticeItemV14[] = [
      { id: "P001", title: "智能质控系统实践", hospital: "浙一医院" },
      { id: "P002", title: "日间手术管理", hospital: "邵逸夫医院" },
    ];
    const result = searchBestPractices("质控", practices);
    expect(result.matched).toContainEqual({ id: "P001", title: "智能质控系统实践" });
    expect(result.count).toBe(1);
  });
});

describe("searchBestPractices 多匹配", () => {
  // 手算：query='医院'
  // 手算：practices=[{id:'P001',title:'智能质控系统实践',hospital:'浙一医院'},{id:'P002',title:'日间手术管理',hospital:'邵逸夫医院'}]
  // 手算：两项 hospital 都含'医院'子串 → matched 含两项, count=2
  it("query='医院', practices=[{id:'P001',title:'智能质控系统实践',hospital:'浙一医院'},{id:'P002',title:'日间手术管理',hospital:'邵逸夫医院'}] → matched 含两项, count=2", () => {
    const practices: BestPracticeItemV14[] = [
      { id: "P001", title: "智能质控系统实践", hospital: "浙一医院" },
      { id: "P002", title: "日间手术管理", hospital: "邵逸夫医院" },
    ];
    const result = searchBestPractices("医院", practices);
    expect(result.matched.length).toBe(2);
    expect(result.count).toBe(2);
  });
});

describe("buildBestPracticeReport 构建报告", () => {
  // 手算：{matched:[{id:'P001',title:'智能质控系统实践'},{id:'P002',title:'日间手术管理'}], count=2} → firstPractice=第一项 title='智能质控系统实践'
  it("{matched:[{id:'P001',title:'智能质控系统实践'},{id:'P002',title:'日间手术管理'}], count=2} → firstPractice='智能质控系统实践'", () => {
    const report = buildBestPracticeReport({
      matched: [
        { id: "P001", title: "智能质控系统实践" },
        { id: "P002", title: "日间手术管理" },
      ],
      count: 2,
    });
    expect(report.firstPractice).toBe("智能质控系统实践");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-best-practice auth:true", () => {
    const def = (emrQcBestPracticeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-best-practice");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
