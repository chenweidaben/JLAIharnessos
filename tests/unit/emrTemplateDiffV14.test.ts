/**
 * 健澜科技 jlmedaios - 病历模板版本对比 V14 单测（M466-C）
 *
 * 测试 diffTemplates added/removed 差集、summarizeChanges 摘要文本、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  diffTemplates,
  summarizeChanges,
  type TemplateVersionV14,
} from "../../src/bff/aggregators/emrTemplateDiffV14Aggregator";
import { emrTemplateDiffV14Routes } from "../../src/bff/routes/emrTemplateDiffV14";
import type { RouteDef } from "../../src/bff/types";

describe("diffTemplates 新增", () => {
  // 手算：v1=[A], v2=[A,B] → added=["B"], removed=[]
  it("v1 有字段 A，v2 有 A+B → added=['B'], removed=[]", () => {
    const v1: TemplateVersionV14 = { version: "v1.0", fields: ["A"] };
    const v2: TemplateVersionV14 = { version: "v2.0", fields: ["A", "B"] };
    const diff = diffTemplates(v1, v2);
    expect(diff.added).toEqual(["B"]);
    expect(diff.removed).toEqual([]);
  });
});

describe("diffTemplates 删除", () => {
  // 手算：v1=[A,B], v2=[A] → removed=["B"]
  it("v1 有 A+B，v2 只有 A → removed=['B']", () => {
    const v1: TemplateVersionV14 = { version: "v1.0", fields: ["A", "B"] };
    const v2: TemplateVersionV14 = { version: "v2.0", fields: ["A"] };
    const diff = diffTemplates(v1, v2);
    expect(diff.removed).toEqual(["B"]);
  });
});

describe("diffTemplates 完全相同", () => {
  // 手算：v1=[A,B], v2=[A,B] → added=[], removed=[]
  it("两版本完全相同 → added=[], removed=[]", () => {
    const v1: TemplateVersionV14 = { version: "v1.0", fields: ["A", "B"] };
    const v2: TemplateVersionV14 = { version: "v2.0", fields: ["A", "B"] };
    const diff = diffTemplates(v1, v2);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });
});

describe("summarizeChanges 摘要", () => {
  // 手算：added=2, removed=1, changed=1 → 摘要含"新增 2 个字段"
  it("added=2,removed=1,changed=1 → 摘要含'新增 2 个字段'", () => {
    const summary = summarizeChanges({ added: ["A", "B"], removed: ["C"], changed: ["D"] });
    expect(summary).toContain("新增 2 个字段");
    expect(summary).toContain("删除 1 个字段");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-diff/:templateId auth:true", () => {
    const def = (emrTemplateDiffV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-diff/:templateId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
