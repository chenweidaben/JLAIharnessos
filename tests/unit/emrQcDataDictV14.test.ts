/**
 * 健澜科技 jlmedaios - 质控数据字典管理 V14 单测（M498-C）
 *
 * 测试 buildDataDict 构建、searchDataDict 搜索、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDataDict,
  searchDataDict,
  type DataDictV14,
} from "../../src/bff/aggregators/emrQcDataDictV14Aggregator";
import { emrQcDataDictV14Routes } from "../../src/bff/routes/emrQcDataDictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDataDict 缺陷类型", () => {
  // 手算：category='缺陷类型', items=['缺主诉','缺现病史'] → 正确构建
  it("category='缺陷类型', items=['缺主诉','缺现病史'] → 正确构建", () => {
    const dict: DataDictV14 = buildDataDict("缺陷类型", ["缺主诉", "缺现病史"]);
    expect(dict.category).toBe("缺陷类型");
    expect(dict.items).toEqual(["缺主诉", "缺现病史"]);
  });
});

describe("searchDataDict 按分类名", () => {
  // 手算：3 个字典（缺陷类型/缺主诉, 科室/内科, 缺陷类型/缺查体），keyword='缺陷类型' → 返回 2 个
  it("keyword='缺陷类型' → 返回 2 个", () => {
    const dicts = [
      buildDataDict("缺陷类型", ["缺主诉", "缺现病史"]),
      buildDataDict("科室", ["内科", "外科"]),
      buildDataDict("缺陷类型", ["缺查体", "缺过敏史"]),
    ];
    const result = searchDataDict(dicts, "缺陷类型");
    expect(result.length).toBe(2);
  });
});

describe("searchDataDict 按词条", () => {
  // 手算：keyword='内科' → 返回 1 个（科室/内科）
  it("keyword='内科' → 返回 1 个", () => {
    const dicts = [
      buildDataDict("缺陷类型", ["缺主诉", "缺现病史"]),
      buildDataDict("科室", ["内科", "外科"]),
      buildDataDict("严重等级", ["一般", "较重"]),
    ];
    const result = searchDataDict(dicts, "内科");
    expect(result.length).toBe(1);
    expect(result[0].category).toBe("科室");
  });
});

describe("searchDataDict 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    const dicts: DataDictV14[] = [];
    const result = searchDataDict(dicts, "缺陷类型");
    expect(result.length).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-data-dict auth:true", () => {
    const def = (emrQcDataDictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-data-dict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
