/**
 * 健澜科技 jlmedaios - 质控规则版本管理 V14 单测（M519-B）
 *
 * 测试 buildRuleVersion 构建版本、compareRuleVersions 对比版本、buildRuleVersionReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRuleVersion,
  buildRuleVersionReport,
  compareRuleVersions,
  type RuleVersionCompareV14,
} from "../../src/bff/aggregators/emrQcRuleVersionV14Aggregator";
import { emrQcRuleVersionV14Routes } from "../../src/bff/routes/emrQcRuleVersionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRuleVersion 构建版本", () => {
  // 手算：ruleName='病程记录及时性', version='v2.1.0', changeLog='阈值从24h改为12h' → 正确构建
  it("ruleName='病程记录及时性', version='v2.1.0', changeLog='阈值从24h改为12h' → 正确构建", () => {
    const version = buildRuleVersion("病程记录及时性", "v2.1.0", "阈值从24h改为12h");
    expect(version.ruleName).toBe("病程记录及时性");
    expect(version.version).toBe("v2.1.0");
    expect(version.changeLog).toBe("阈值从24h改为12h");
  });
});

describe("compareRuleVersions 仅 threshold 变化", () => {
  // 手算：old={threshold:24,enabled:true}, new={threshold:12,enabled:true} → 仅 threshold 变化
  // 手算：enabled true→true → isBreaking=false
  it("old={threshold:24,enabled:true}, new={threshold:12,enabled:true} → changedFields=['threshold'], isBreaking=false", () => {
    const oldVersion: RuleVersionCompareV14 = { threshold: 24, enabled: true };
    const newVersion: RuleVersionCompareV14 = { threshold: 12, enabled: true };
    const result = compareRuleVersions(oldVersion, newVersion);
    expect(result.changedFields).toEqual(["threshold"]);
    expect(result.isBreaking).toBe(false);
  });
});

describe("compareRuleVersions enabled true→false 破坏性", () => {
  // 手算：old={threshold:24,enabled:true}, new={threshold:24,enabled:false} → 仅 enabled 变化
  // 手算：enabled true→false → isBreaking=true
  it("old={threshold:24,enabled:true}, new={threshold:24,enabled:false} → changedFields=['enabled'], isBreaking=true", () => {
    const oldVersion: RuleVersionCompareV14 = { threshold: 24, enabled: true };
    const newVersion: RuleVersionCompareV14 = { threshold: 24, enabled: false };
    const result = compareRuleVersions(oldVersion, newVersion);
    expect(result.changedFields).toEqual(["enabled"]);
    expect(result.isBreaking).toBe(true);
  });
});

describe("buildRuleVersionReport 两个变更", () => {
  // 手算：{changedFields:['threshold','enabled'], isBreaking:true} → changeCount=2（数组长度）
  it("{changedFields:['threshold','enabled'], isBreaking:true} → changeCount=2", () => {
    const report = buildRuleVersionReport({ changedFields: ["threshold", "enabled"], isBreaking: true });
    expect(report.changeCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rule-version auth:true", () => {
    const def = (emrQcRuleVersionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rule-version");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
