/**
 * 健澜科技 jlmedaios - 病历术语标准词库 V14 单测（M464-B）
 *
 * 测试 lookupStandardTerm 高血压→高血压病、感冒→急性上呼吸道感染、未知词→null、suggestCorrections 血压高→高血压病、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  lookupStandardTerm,
  suggestCorrections,
} from "../../src/bff/aggregators/emrTermDictV14Aggregator";
import { emrTermDictV14Routes } from "../../src/bff/routes/emrTermDictV14";
import type { RouteDef } from "../../src/bff/types";

describe("lookupStandardTerm 高血压", () => {
  // 手算："高血压" 是 "高血压病" 的同义词 → 返回 "高血压病"
  it("'高血压' → '高血压病'", () => {
    expect(lookupStandardTerm("高血压")).toBe("高血压病");
  });
});

describe("lookupStandardTerm 感冒", () => {
  // 手算："感冒" 是 "急性上呼吸道感染" 的同义词 → 返回 "急性上呼吸道感染"
  it("'感冒' → '急性上呼吸道感染'", () => {
    expect(lookupStandardTerm("感冒")).toBe("急性上呼吸道感染");
  });
});

describe("lookupStandardTerm 未知词", () => {
  // 手算："未知词xyz" 不在任何同义词数组中 → 返回 null
  it("'未知词xyz' → null", () => {
    expect(lookupStandardTerm("未知词xyz")).toBeNull();
  });
});

describe("suggestCorrections 血压高", () => {
  // 手算：输入含"血压高"→命中"高血压病"的同义词→建议纠错为"高血压病"
  it("输入含'血压高' → 建议纠错为'高血压病'", () => {
    const suggestions = suggestCorrections("患者血压高");
    expect(suggestions.some((s) => s.standard === "高血压病")).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-term-dict auth:true", () => {
    const def = (emrTermDictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-term-dict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
