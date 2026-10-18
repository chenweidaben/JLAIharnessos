/**
 * 健澜科技 jlmedaios - 病历模板版本管理 V14 单测（M539-D）
 *
 * 测试 buildTemplateVersion 构建模板版本、listTemplateVersion 版本列表、buildTemplateVersionReport 构建版本报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTemplateVersion,
  buildTemplateVersionReport,
  listTemplateVersion,
  type TemplateVersionInputV14,
  type TemplateVersionItemV14,
} from "../../src/bff/aggregators/emrTemplateVersionV14Aggregator";
import { emrTemplateVersionV14Routes } from "../../src/bff/routes/emrTemplateVersionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTemplateVersion 构建模板版本", () => {
  // 手算：templateName='入院记录模板', dept='心内科' → 正确构建
  it("templateName='入院记录模板', dept='心内科' → 正确构建", () => {
    const base = buildTemplateVersion("入院记录模板", "心内科");
    expect(base.templateName).toBe("入院记录模板");
    expect(base.dept).toBe("心内科");
  });
});

describe("listTemplateVersion 多版本", () => {
  // 手算：{versions=[{version='v2.0',updatedAt='2026-09-01'},{version='v1.0',updatedAt='2026-01-01'}]}
  // 手算：versionCount = versions.length = 2
  // 手算：latestVersion = versions[0].version = 'v2.0'
  it("{versions=[v2.0, v1.0]} → versionCount=2, latestVersion='v2.0'", () => {
    const versions: TemplateVersionItemV14[] = [
      { version: "v2.0", updatedAt: "2026-09-01" },
      { version: "v1.0", updatedAt: "2026-01-01" },
    ];
    const input: TemplateVersionInputV14 = { versions };
    const result = listTemplateVersion(input);
    expect(result.versionCount).toBe(2);
    expect(result.latestVersion).toBe("v2.0");
  });
});

describe("listTemplateVersion 空", () => {
  // 手算：{versions=[]}
  // 手算：versionCount = versions.length = 0
  // 手算：latestVersion = '无版本'
  it("{versions=[]} → versionCount=0, latestVersion='无版本'", () => {
    const input: TemplateVersionInputV14 = { versions: [] };
    const result = listTemplateVersion(input);
    expect(result.versionCount).toBe(0);
    expect(result.latestVersion).toBe("无版本");
  });
});

describe("buildTemplateVersionReport 构建版本报告", () => {
  // 手算：{versionCount=2, latestVersion='v2.0'}
  // 手算：透传 versionCount + latestVersion
  it("{versionCount=2, latestVersion='v2.0'} → 正确返回（透传）", () => {
    const report = buildTemplateVersionReport({ versionCount: 2, latestVersion: "v2.0" });
    expect(report.versionCount).toBe(2);
    expect(report.latestVersion).toBe("v2.0");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-version auth:true", () => {
    const def = (emrTemplateVersionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-version");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
