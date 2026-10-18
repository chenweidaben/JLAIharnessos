/**
 * 健澜科技 jlmedaios - 质控法律法规 V14 单测（M505-D，M505 收官）
 *
 * 测试 buildRegulation 构建、searchRegulation 搜索、buildRegulationReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRegulation,
  buildRegulationReport,
  searchRegulation,
  type RegulationV14,
} from "../../src/bff/aggregators/emrQcRegulationV14Aggregator";
import { emrQcRegulationV14Routes } from "../../src/bff/routes/emrQcRegulationV14";
import type { RouteDef } from "../../src/bff/types";

const sampleRegulations: RegulationV14[] = [
  buildRegulation("医疗质量管理办法", "部门规章", "2023-08-01"),
  buildRegulation("中华人民共和国执业医师法", "法律", "2022-03-01"),
  buildRegulation("医疗机构管理条例", "行政法规", "2022-05-01"),
];

describe("buildRegulation 医疗质量管理办法", () => {
  // 手算：title='医疗质量管理办法', level='部门规章', publishDate='2023-08-01' → 正确构建
  it("title='医疗质量管理办法', level='部门规章', publishDate='2023-08-01' → 正确构建", () => {
    const reg: RegulationV14 = buildRegulation("医疗质量管理办法", "部门规章", "2023-08-01");
    expect(reg.title).toBe("医疗质量管理办法");
    expect(reg.level).toBe("部门规章");
    expect(reg.publishDate).toBe("2023-08-01");
  });
});

describe("searchRegulation 医疗", () => {
  // 手算：3 条法规，keyword='医疗' → title 包含'医疗'的有 2 条（医疗质量管理办法、医疗机构管理条例）
  it("keyword='医疗' → 返回 2 条", () => {
    const results = searchRegulation(sampleRegulations, "医疗");
    expect(results.length).toBe(2);
    expect(results[0].title).toBe("医疗质量管理办法");
    expect(results[1].title).toBe("医疗机构管理条例");
  });
});

describe("searchRegulation 管理", () => {
  // 手算：3 条法规，keyword='管理' → 医疗质量管理办法、医疗机构管理条例，共 2 条
  it("keyword='管理' → 返回 2 条", () => {
    const results = searchRegulation(sampleRegulations, "管理");
    expect(results.length).toBe(2);
  });
});

describe("buildRegulationReport 两条结果", () => {
  // 手算：2 条结果 → resultCount=2（数组长度）
  it("2 条结果 → resultCount=2", () => {
    const results: RegulationV14[] = [
      buildRegulation("医疗质量管理办法", "部门规章", "2023-08-01"),
      buildRegulation("医疗机构管理条例", "行政法规", "2022-05-01"),
    ];
    const report = buildRegulationReport(results);
    expect(report.resultCount).toBe(2);
    expect(report.results.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-regulation auth:true", () => {
    const def = (emrQcRegulationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-regulation");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
