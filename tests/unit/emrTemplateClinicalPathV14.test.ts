/**
 * 健澜科技 jlmedaios - 临床路径模板联动 V14 单测（M525-A）
 *
 * 测试 buildClinicalPathLink 构建联动、linkClinicalPathTemplate 临床路径联动、buildClinicalPathLinkReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClinicalPathLink,
  buildClinicalPathLinkReport,
  linkClinicalPathTemplate,
  type ClinicalPathLinkInputV14,
} from "../../src/bff/aggregators/emrTemplateClinicalPathV14Aggregator";
import { emrTemplateClinicalPathV14Routes } from "../../src/bff/routes/emrTemplateClinicalPathV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildClinicalPathLink 构建联动", () => {
  // 手算：pathName='心内科临床路径', templateName='入院记录模板' → 正确构建
  it("pathName='心内科临床路径', templateName='入院记录模板' → 正确构建", () => {
    const link = buildClinicalPathLink("心内科临床路径", "入院记录模板");
    expect(link.pathName).toBe("心内科临床路径");
    expect(link.templateName).toBe("入院记录模板");
  });
});

describe("linkClinicalPathTemplate 全覆盖", () => {
  // 手算：requiredTemplates=['入院记录','手术记录','出院小结'], usedTemplates=['入院记录','手术记录','出院小结']
  // 手算：matched = used ∩ required = 3 项 → matchedCount=3
  // 手算：missing = required - used = 0 项 → missingCount=0
  // 手算：coverage = 3/3*1000 = 1000 → Math.round(1000)/10 = 100.0
  it("requiredTemplates=['入院记录','手术记录','出院小结'], usedTemplates=['入院记录','手术记录','出院小结'] → matchedCount=3, missingCount=0, coverage=100.0", () => {
    const input: ClinicalPathLinkInputV14 = {
      pathSteps: ["入院评估", "检查检验"],
      requiredTemplates: ["入院记录", "手术记录", "出院小结"],
      usedTemplates: ["入院记录", "手术记录", "出院小结"],
    };
    const result = linkClinicalPathTemplate(input);
    expect(result.matchedCount).toBe(3);
    expect(result.missingCount).toBe(0);
    expect(result.coverage).toBeCloseTo(100.0, 1);
  });
});

describe("linkClinicalPathTemplate 部分缺失", () => {
  // 手算：requiredTemplates=['入院记录','手术记录','出院小结'], usedTemplates=['入院记录']
  // 手算：matched = used ∩ required = ['入院记录'] → matchedCount=1
  // 手算：missing = required - used = ['手术记录','出院小结'] → missingCount=2
  // 手算：coverage = 1/3*1000 = 333.333... → Math.round(333.333)/10 = 333/10 = 33.3
  it("requiredTemplates=['入院记录','手术记录','出院小结'], usedTemplates=['入院记录'] → matchedCount=1, missingCount=2, coverage=33.3", () => {
    const input: ClinicalPathLinkInputV14 = {
      pathSteps: ["入院评估"],
      requiredTemplates: ["入院记录", "手术记录", "出院小结"],
      usedTemplates: ["入院记录"],
    };
    const result = linkClinicalPathTemplate(input);
    expect(result.matchedCount).toBe(1);
    expect(result.missingCount).toBe(2);
    expect(result.coverage).toBeCloseTo(33.3, 1);
  });
});

describe("buildClinicalPathLinkReport 构建报告", () => {
  // 手算：{matchedCount:1, missingCount:2, coverage:33.3}
  // 手算：透传 matchedCount + coverage
  it("{matchedCount:1, missingCount:2, coverage:33.3} → 正确返回（透传）", () => {
    const report = buildClinicalPathLinkReport({ matchedCount: 1, missingCount: 2, coverage: 33.3 });
    expect(report.matchedCount).toBe(1);
    expect(report.coverage).toBeCloseTo(33.3, 1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-clinical-path auth:true", () => {
    const def = (emrTemplateClinicalPathV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-clinical-path");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
