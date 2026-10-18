/**
 * 健澜科技 jlmedaios - 病历模板质控联动 V14 单测（M477-D，M477 收官）
 *
 * 测试 buildTemplateQcLink 构建关联、getQcRulesForTemplate 规则查询、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTemplateQcLink,
  getQcRulesForTemplate,
  type TemplateQcLinkV14,
} from "../../src/bff/aggregators/emrTemplateQcLinkV14Aggregator";
import { emrTemplateQcLinkV14Routes } from "../../src/bff/routes/emrTemplateQcLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTemplateQcLink 构建", () => {
  // 手算：templateId='T001', templateName='入院记录', rules=['完整性','时效性'] → 正确构建
  it("templateId=T001, templateName=入院记录, rules=[完整性,时效性] → 正确构建", () => {
    const link = buildTemplateQcLink("T001", "入院记录", ["完整性", "时效性"]);
    expect(link.templateId).toBe("T001");
    expect(link.templateName).toBe("入院记录");
    expect(link.rules.length).toBe(2);
  });
});

describe("getQcRulesForTemplate 查询 T001", () => {
  // 手算：links 含 T001/T002，查 T001 → 返回 2 条规则
  it("links 含 T001/T002，查 T001 → 返回 2 条规则", () => {
    const links: TemplateQcLinkV14[] = [
      buildTemplateQcLink("T001", "入院记录", ["完整性", "时效性"]),
      buildTemplateQcLink("T002", "出院记录", ["完整性", "规范性"]),
    ];
    const rules = getQcRulesForTemplate(links, "T001");
    expect(rules.length).toBe(2);
  });
});

describe("getQcRulesForTemplate 不存在的模板", () => {
  // 手算：查不存在的模板 ID → 返回空数组 []
  it("查不存在的模板 ID → 返回空数组", () => {
    const links: TemplateQcLinkV14[] = [
      buildTemplateQcLink("T001", "入院记录", ["完整性"]),
    ];
    expect(getQcRulesForTemplate(links, "不存在xyz")).toEqual([]);
  });
});

describe("getQcRulesForTemplate 空 links", () => {
  // 手算：空 links → 返回空数组 []
  it("空 links → 返回空数组", () => {
    expect(getQcRulesForTemplate([], "T001")).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-qc-link auth:true", () => {
    const def = (emrTemplateQcLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-qc-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
