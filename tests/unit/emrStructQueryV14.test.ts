/**
 * 健澜科技 jlmedaios - 病历结构化字段查询 V14 单测（M532-A）
 *
 * 测试 buildStructQuery 构建查询、queryStructFields 字段查询、buildStructQueryReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStructQuery,
  buildStructQueryReport,
  queryStructFields,
  type StructQueryInputV14,
} from "../../src/bff/aggregators/emrStructQueryV14Aggregator";
import { emrStructQueryV14Routes } from "../../src/bff/routes/emrStructQueryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStructQuery 构建查询", () => {
  // 手算：recordType='入院记录', dept='心内科' → 正确构建
  it("recordType='入院记录', dept='心内科' → 正确构建", () => {
    const query = buildStructQuery("入院记录", "心内科");
    expect(query.recordType).toBe("入院记录");
    expect(query.dept).toBe("心内科");
  });
});

describe("queryStructFields 全命中", () => {
  // 手算：{recordType:'入院记录', availableFields=['主诉','现病史','诊断'], requestedFields=['主诉','诊断']}
  // 手算：foundFields = requested 中在 available 的项 = ['主诉','诊断']
  // 手算：missingFields = requested 中不在 available 的项 = []
  it("{recordType:'入院记录', availableFields=['主诉','现病史','诊断'], requestedFields=['主诉','诊断']} → foundFields 2项, missingFields=[]", () => {
    const input: StructQueryInputV14 = {
      recordType: "入院记录",
      availableFields: ["主诉", "现病史", "诊断"],
      requestedFields: ["主诉", "诊断"],
    };
    const result = queryStructFields(input);
    expect(result.foundFields).toEqual(["主诉", "诊断"]);
    expect(result.missingFields).toEqual([]);
  });
});

describe("queryStructFields 有缺失", () => {
  // 手算：{recordType:'入院记录', availableFields=['主诉','现病史'], requestedFields=['主诉','手术记录']}
  // 手算：foundFields = ['主诉']（'主诉'在available中）
  // 手算：missingFields = ['手术记录']（'手术记录'不在available中）
  it("{recordType:'入院记录', availableFields=['主诉','现病史'], requestedFields=['主诉','手术记录']} → foundFields=['主诉'], missingFields=['手术记录']", () => {
    const input: StructQueryInputV14 = {
      recordType: "入院记录",
      availableFields: ["主诉", "现病史"],
      requestedFields: ["主诉", "手术记录"],
    };
    const result = queryStructFields(input);
    expect(result.foundFields).toEqual(["主诉"]);
    expect(result.missingFields).toEqual(["手术记录"]);
  });
});

describe("buildStructQueryReport 构建报告", () => {
  // 手算：{foundCount:1, missingCount:1}
  // 手算：透传 foundCount + missingCount
  it("{foundCount:1, missingCount:1} → 正确返回（透传）", () => {
    const report = buildStructQueryReport({ foundCount: 1, missingCount: 1 });
    expect(report.foundCount).toBe(1);
    expect(report.missingCount).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-struct-query auth:true", () => {
    const def = (emrStructQueryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-struct-query");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
