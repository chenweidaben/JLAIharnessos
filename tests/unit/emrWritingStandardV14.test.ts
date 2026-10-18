/**
 * 健澜科技 jlmedaios - 病历书写规范知识库 V14 单测（M469-C）
 *
 * 测试 WRITING_STANDARDS_V14 条目数、searchStandards 搜索、getRequiredSections 必填条目、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  getRequiredSections,
  searchStandards,
  WRITING_STANDARDS_V14,
} from "../../src/bff/aggregators/emrWritingStandardV14Aggregator";
import { emrWritingStandardV14Routes } from "../../src/bff/routes/emrWritingStandardV14";
import type { RouteDef } from "../../src/bff/types";

describe("WRITING_STANDARDS_V14 条目数", () => {
  // 手算：内置 5 条规范（主诉/现病史/既往史/体格检查/诊断）→ 条目数=5 ≥ 5
  it("条目数≥5", () => {
    expect(WRITING_STANDARDS_V14.length).toBeGreaterThanOrEqual(5);
  });
});

describe("searchStandards 主诉", () => {
  // 手算："主诉"关键词 → 匹配 S001（主诉应简明扼要）→ 非空数组
  it("'主诉' → 返回含'主诉'标题的条目（非空）", () => {
    const results = searchStandards("主诉");
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("searchStandards 无匹配", () => {
  // 手算："不存在的关键词xyz" → 无匹配 → 空数组 []
  it("'不存在的关键词xyz' → 返回空数组", () => {
    expect(searchStandards("不存在的关键词xyz")).toEqual([]);
  });
});

describe("getRequiredSections 必填", () => {
  // 手算：required=true 的条目 → 返回的所有条目 required 都为 true
  it("返回的条目全部 required=true", () => {
    const required = getRequiredSections();
    expect(required.every((e) => e.required === true)).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-writing-standard auth:true", () => {
    const def = (emrWritingStandardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-writing-standard");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
