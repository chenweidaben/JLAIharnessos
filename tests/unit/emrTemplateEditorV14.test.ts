/**
 * 健澜科技 jlmedaios - 病历模板可视化编辑器 V14 单测（M465-A）
 *
 * 测试 validateTemplateLayout 合法→valid=true、空 sections→valid=false、label 为空→valid=false、buildTemplatePreview fieldCount=5、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTemplatePreview,
  validateTemplateLayout,
  type TemplateLayoutV14,
} from "../../src/bff/aggregators/emrTemplateEditorV14Aggregator";
import { emrTemplateEditorV14Routes } from "../../src/bff/routes/emrTemplateEditorV14";
import type { RouteDef } from "../../src/bff/types";

const validLayout: TemplateLayoutV14 = {
  templateId: "TPL001",
  sections: [
    {
      name: "主诉",
      fields: [
        { key: "cc", label: "主诉", visible: true },
      ],
    },
  ],
};

describe("validateTemplateLayout 合法布局", () => {
  // 手算：1 个 section 含 1 个 label 非空字段 → valid=true, errors=[]
  it("合法布局 → valid=true, errors=[]", () => {
    const result = validateTemplateLayout(validLayout);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("validateTemplateLayout 空 sections", () => {
  // 手算：sections=[] → valid=false, errors 含"至少需要 1 个区域"
  it("空 sections → valid=false, errors 含提示", () => {
    const layout: TemplateLayoutV14 = { templateId: "TPL002", sections: [] };
    const result = validateTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("区域"))).toBe(true);
  });
});

describe("validateTemplateLayout 字段 label 为空", () => {
  // 手算：字段 label="" → valid=false, errors 含 label 空提示
  it("字段 label 为空 → valid=false", () => {
    const layout: TemplateLayoutV14 = {
      templateId: "TPL003",
      sections: [{ name: "查体", fields: [{ key: "pe", label: "", visible: true }] }],
    };
    const result = validateTemplateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("label"))).toBe(true);
  });
});

describe("buildTemplatePreview 字段计数", () => {
  // 手算：section1 有 2 字段 + section2 有 3 字段 = 5 字段 → fieldCount=5
  it("2 个 section 共 5 字段 → fieldCount=5", () => {
    const layout: TemplateLayoutV14 = {
      templateId: "TPL004",
      sections: [
        { name: "主诉", fields: [{ key: "a", label: "A", visible: true }, { key: "b", label: "B", visible: true }] },
        { name: "现病史", fields: [{ key: "c", label: "C", visible: true }, { key: "d", label: "D", visible: true }, { key: "e", label: "E", visible: true }] },
      ],
    };
    const preview = buildTemplatePreview(layout);
    expect(preview.fieldCount).toBe(5);
    expect(preview.sections.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-editor/:templateId auth:true", () => {
    const def = (emrTemplateEditorV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-editor/:templateId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
