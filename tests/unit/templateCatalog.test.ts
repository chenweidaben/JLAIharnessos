/**
 * 健澜科技 jlmedaios - 病历模板目录单测（M460 大三甲深度升级）
 *
 * 测试模板目录返回数量 ≥ 5、按 scenario 筛选门诊 5 字段模板字段数=5、住院模板含 12 模块、AI 模板 level='ai'。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import { getTemplateCatalog, getTemplatesByScenario } from "../../src/knowledge/templates/templateCatalog";

describe("模板目录数量", () => {
  it("模板目录返回数量 ≥ 5", () => {
    const catalog = getTemplateCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(5);
  });
});

describe("按 scenario 筛选门诊", () => {
  it("门诊精简模板 OUTPATIENT_LITE 字段数 = 5", () => {
    const outpatientTemplates = getTemplatesByScenario("outpatient");
    expect(outpatientTemplates.length).toBeGreaterThanOrEqual(1);
    const lite = outpatientTemplates.find((t) => t.templateId === "OUTPATIENT_LITE");
    expect(lite).toBeDefined();
    expect(lite?.fields.length).toBe(5);
  });
});

describe("住院通用模板 12 模块", () => {
  it("GENERAL_INPATIENT 字段数 = 12", () => {
    const catalog = getTemplateCatalog();
    const general = catalog.find((t) => t.templateId === "GENERAL_INPATIENT");
    expect(general).toBeDefined();
    expect(general?.fields.length).toBe(12);
  });
});

describe("AI 模板 level='ai'", () => {
  it("AI_GENERATED level === 'ai'", () => {
    const catalog = getTemplateCatalog();
    const ai = catalog.find((t) => t.templateId === "AI_GENERATED");
    expect(ai).toBeDefined();
    expect(ai?.level).toBe("ai");
  });
});

describe("按 scenario 筛选住院", () => {
  it("住院模板数 ≥ 5", () => {
    const inpatientTemplates = getTemplatesByScenario("inpatient");
    expect(inpatientTemplates.length).toBeGreaterThanOrEqual(5);
  });
});
