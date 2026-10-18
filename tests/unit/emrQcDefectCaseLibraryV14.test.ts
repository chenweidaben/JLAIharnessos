/**
 * 健澜科技 jlmedaios - 质控缺陷案例库 V14 单测（M520-B）
 *
 * 测试 buildDefectCaseLibrary 构建案例库、searchDefectCases 搜索案例、buildDefectCaseLibraryReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDefectCaseLibrary,
  buildDefectCaseLibraryReport,
  searchDefectCases,
  type DefectCaseV14,
} from "../../src/bff/aggregators/emrQcDefectCaseLibraryV14Aggregator";
import { emrQcDefectCaseLibraryV14Routes } from "../../src/bff/routes/emrQcDefectCaseLibraryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDefectCaseLibrary 构建案例库", () => {
  // 手算：category='时限类', totalCases=120 → 正确构建
  it("category='时限类', totalCases=120 → 正确构建", () => {
    const library = buildDefectCaseLibrary("时限类", 120);
    expect(library.category).toBe("时限类");
    expect(library.totalCases).toBe(120);
  });
});

describe("searchDefectCases 单匹配", () => {
  // 手算：query='病程'
  // 手算：cases=[{id:'C001',title:'病程记录不及时',category:'时限类'},{id:'C002',title:'手术记录缺失',category:'完整性类'}]
  // 手算：仅 C001 的 title 含'病程'子串 → matched 含 C001, count=1
  it("query='病程', cases=[{id:'C001',title:'病程记录不及时',category:'时限类'},{id:'C002',title:'手术记录缺失',category:'完整性类'}] → matched 含 C001, count=1", () => {
    const cases: DefectCaseV14[] = [
      { id: "C001", title: "病程记录不及时", category: "时限类" },
      { id: "C002", title: "手术记录缺失", category: "完整性类" },
    ];
    const result = searchDefectCases("病程", cases);
    expect(result.matched).toContainEqual({ id: "C001", title: "病程记录不及时" });
    expect(result.count).toBe(1);
  });
});

describe("searchDefectCases 多匹配", () => {
  // 手算：query='记录'
  // 手算：cases=[{id:'C001',title:'病程记录不及时',category:'时限类'},{id:'C002',title:'手术记录缺失',category:'完整性类'}]
  // 手算：两项 title 都含'记录'子串 → matched 含两项, count=2
  it("query='记录', cases=[{id:'C001',title:'病程记录不及时',category:'时限类'},{id:'C002',title:'手术记录缺失',category:'完整性类'}] → matched 含两项, count=2", () => {
    const cases: DefectCaseV14[] = [
      { id: "C001", title: "病程记录不及时", category: "时限类" },
      { id: "C002", title: "手术记录缺失", category: "完整性类" },
    ];
    const result = searchDefectCases("记录", cases);
    expect(result.matched.length).toBe(2);
    expect(result.count).toBe(2);
  });
});

describe("buildDefectCaseLibraryReport 构建报告", () => {
  // 手算：{matched:[{id:'C001',title:'病程记录不及时'},{id:'C002',title:'手术记录缺失'}], count=2} → firstCase=第一项 title='病程记录不及时'
  it("{matched:[{id:'C001',title:'病程记录不及时'},{id:'C002',title:'手术记录缺失'}], count=2} → firstCase='病程记录不及时'", () => {
    const report = buildDefectCaseLibraryReport({
      matched: [
        { id: "C001", title: "病程记录不及时" },
        { id: "C002", title: "手术记录缺失" },
      ],
      count: 2,
    });
    expect(report.firstCase).toBe("病程记录不及时");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-defect-case-library auth:true", () => {
    const def = (emrQcDefectCaseLibraryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-defect-case-library");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
