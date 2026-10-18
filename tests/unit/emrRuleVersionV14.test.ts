/**
 * 健澜科技 jlmedaios - 病历质控规则版本管理 V14 单测（M472-B）
 *
 * 测试 buildVersionHistory 降序排列、compareVersions 差集对比、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildVersionHistory,
  compareVersions,
  type VersionEntryV14,
} from "../../src/bff/aggregators/emrRuleVersionV14Aggregator";
import { emrRuleVersionV14Routes } from "../../src/bff/routes/emrRuleVersionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildVersionHistory 降序", () => {
  // 手算：v1.0 date=2026-01-01，v1.1 date=2026-06-01
  // 按 date 降序：2026-06-01 > 2026-01-01 → v1.1 排第一，v1.0 排第二
  it("2 个版本按 date 降序排列", () => {
    const versions: VersionEntryV14[] = [
      { version: "v1.0", changes: "关键词A", date: "2026-01-01" },
      { version: "v1.1", changes: "关键词B", date: "2026-06-01" },
    ];
    const history = buildVersionHistory("RULE-001", versions);
    expect(history.versions[0]?.version).toBe("v1.1");
    expect(history.versions[1]?.version).toBe("v1.0");
  });
});

describe("compareVersions 差集", () => {
  // 手算：v1 changes="关键词A,关键词B"，v2 changes="关键词B,关键词C"
  // v1Set = {A, B}，v2Set = {B, C}
  // added = v2 有 v1 没有 → {C} → ["关键词C"]
  // removed = v1 有 v2 没有 → {A} → ["关键词A"]
  it("v1='关键词A,关键词B', v2='关键词B,关键词C' → added=['关键词C'], removed=['关键词A']", () => {
    const diff = compareVersions(
      { changes: "关键词A,关键词B" },
      { changes: "关键词B,关键词C" },
    );
    expect(diff.added).toEqual(["关键词C"]);
    expect(diff.removed).toEqual(["关键词A"]);
  });
});

describe("compareVersions 相同", () => {
  // 手算：两版本 changes 相同 → added=[], removed=[]
  it("两版本 changes 相同 → added=[], removed=[]", () => {
    const diff = compareVersions(
      { changes: "关键词A,关键词B" },
      { changes: "关键词A,关键词B" },
    );
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });
});

describe("buildVersionHistory 空 versions", () => {
  // 手算：空 versions → 返回 ruleId 正确，versions=[]
  it("空 versions → 返回 ruleId 正确，versions=[]", () => {
    const history = buildVersionHistory("RULE-001", []);
    expect(history.ruleId).toBe("RULE-001");
    expect(history.versions).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-rule-version/:ruleId auth:true", () => {
    const def = (emrRuleVersionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-rule-version/:ruleId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
