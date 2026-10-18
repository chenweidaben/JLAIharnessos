/**
 * 健澜科技 jlmedaios - 模板版本对比 V14 单测（M524-A）
 *
 * 测试 buildVersionCompare 构建对比、compareTemplateVersions 版本对比、buildVersionCompareReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildVersionCompare,
  buildVersionCompareReport,
  compareTemplateVersions,
  type VersionCompareInputV14,
} from "../../src/bff/aggregators/emrTemplateVersionCompareV14Aggregator";
import { emrTemplateVersionCompareV14Routes } from "../../src/bff/routes/emrTemplateVersionCompareV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildVersionCompare 构建对比", () => {
  // 手算：templateName='入院记录模板', oldVersion='v2.0', newVersion='v3.0' → 正确构建
  it("templateName='入院记录模板', oldVersion='v2.0', newVersion='v3.0' → 正确构建", () => {
    const compare = buildVersionCompare("入院记录模板", "v2.0", "v3.0");
    expect(compare.templateName).toBe("入院记录模板");
    expect(compare.oldVersion).toBe("v2.0");
    expect(compare.newVersion).toBe("v3.0");
  });
});

describe("compareTemplateVersions 新增", () => {
  // 手算：oldFields=['主诉','现病史','既往史'], newFields=['主诉','现病史','既往史','家族史']
  // 手算：added = newFields 中不在 oldFields 的项 = ['家族史'] → addedCount=1
  // 手算：removed = oldFields 中不在 newFields 的项 = [] → removedCount=0
  // 手算：changedCount=0（纯集合运算）
  it("oldFields=['主诉','现病史','既往史'], newFields=['主诉','现病史','既往史','家族史'] → addedCount=1, removedCount=0, changedCount=0", () => {
    const input: VersionCompareInputV14 = {
      oldFields: ["主诉", "现病史", "既往史"],
      newFields: ["主诉", "现病史", "既往史", "家族史"],
    };
    const result = compareTemplateVersions(input);
    expect(result.addedCount).toBe(1);
    expect(result.removedCount).toBe(0);
    expect(result.changedCount).toBe(0);
  });
});

describe("compareTemplateVersions 删除+修改", () => {
  // 手算：oldFields=['主诉','现病史','既往史','个人史'], newFields=['主诉','现病史','家族史']
  // 手算：added = newFields 中不在 oldFields 的项 = ['家族史'] → addedCount=1
  // 手算：removed = oldFields 中不在 newFields 的项 = ['既往史','个人史'] → removedCount=2
  // 手算：changedCount=0（纯集合运算）
  it("oldFields=['主诉','现病史','既往史','个人史'], newFields=['主诉','现病史','家族史'] → addedCount=1, removedCount=2, changedCount=0", () => {
    const input: VersionCompareInputV14 = {
      oldFields: ["主诉", "现病史", "既往史", "个人史"],
      newFields: ["主诉", "现病史", "家族史"],
    };
    const result = compareTemplateVersions(input);
    expect(result.addedCount).toBe(1);
    expect(result.removedCount).toBe(2);
    expect(result.changedCount).toBe(0);
  });
});

describe("buildVersionCompareReport 构建报告", () => {
  // 手算：{addedCount:1, removedCount:2, changedCount:0}
  // 手算：totalChanges = 1 + 2 + 0 = 3
  // 手算：summary = '新增1项/删除2项/修改0项'
  it("{addedCount:1, removedCount:2, changedCount:0} → totalChanges=3, summary='新增1项/删除2项/修改0项'", () => {
    const report = buildVersionCompareReport({ addedCount: 1, removedCount: 2, changedCount: 0 });
    expect(report.totalChanges).toBe(3);
    expect(report.summary).toBe("新增1项/删除2项/修改0项");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-version-compare auth:true", () => {
    const def = (emrTemplateVersionCompareV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-version-compare");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
