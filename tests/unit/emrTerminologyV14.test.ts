/**
 * 健澜科技 jlmedaios - 病历术语规范 V14 单测（M477-C）
 *
 * 测试 normalizeTerminology 标准化转换、checkTerminology 口语化术语识别、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkTerminology,
  normalizeTerminology,
} from "../../src/bff/aggregators/emrTerminologyV14Aggregator";
import { emrTerminologyV14Routes } from "../../src/bff/routes/emrTerminologyV14";
import type { RouteDef } from "../../src/bff/types";

describe("normalizeTerminology 拉肚子", () => {
  // 手算：口语化"拉肚子" → 医学术语"腹泻"
  it("'拉肚子' → 标准化为'腹泻'", () => {
    expect(normalizeTerminology("拉肚子")).toBe("腹泻");
  });
});

describe("normalizeTerminology 发烧", () => {
  // 手算：口语化"发烧" → 医学术语"发热"
  it("'发烧' → 标准化为'发热'", () => {
    expect(normalizeTerminology("发烧")).toBe("发热");
  });
});

describe("checkTerminology 含口语化", () => {
  // 手算：含"拉肚子" → 返回非空不规范术语列表
  it("含'拉肚子' → 返回非空不规范术语列表", () => {
    const result = checkTerminology("患者拉肚子 3 天");
    expect(result.issueCount).toBeGreaterThan(0);
  });
});

describe("checkTerminology 规范术语", () => {
  // 手算：规范医学术语（无口语化词）→ issues=[]
  it("规范医学术语（无口语化词）→ issues=[]", () => {
    const result = checkTerminology("患者腹泻 3 天，体温 38.5℃");
    expect(result.issues).toEqual([]);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-terminology auth:true", () => {
    const def = (emrTerminologyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-terminology");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
