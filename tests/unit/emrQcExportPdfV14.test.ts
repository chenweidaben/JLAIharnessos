/**
 * 健澜科技 jlmedaios - 质控数据导出 PDF V14 单测（M497-B）
 *
 * 测试 buildExportPdf 构建、formatPdfPage 格式化、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExportPdf,
  formatPdfPage,
  type ExportPdfV14,
} from "../../src/bff/aggregators/emrQcExportPdfV14Aggregator";
import { emrQcExportPdfV14Routes } from "../../src/bff/routes/emrQcExportPdfV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExportPdf 质控报告 A4", () => {
  // 手算：title='质控报告', pageSize='A4' → 正确构建
  it("title='质控报告', pageSize='A4' → 正确构建", () => {
    const config: ExportPdfV14 = buildExportPdf("质控报告", "A4");
    expect(config.title).toBe("质控报告");
    expect(config.pageSize).toBe("A4");
  });
});

describe("formatPdfPage 质控月报", () => {
  // 手算：title='质控月报', content='内科缺陷5例' → 返回包含'质控月报'和'内科缺陷5例'的字符串
  it("title='质控月报', content='内科缺陷5例' → 返回包含'质控月报'和'内科缺陷5例'的字符串", () => {
    const result = formatPdfPage("质控月报", "内科缺陷5例");
    expect(result).toContain("质控月报");
    expect(result).toContain("内科缺陷5例");
  });
});

describe("formatPdfPage 季度报告", () => {
  // 手算：title='季度报告', content='全院缺陷率2%' → 返回包含'季度报告'和'全院缺陷率2%'的字符串
  it("title='季度报告', content='全院缺陷率2%' → 返回包含'季度报告'和'全院缺陷率2%'的字符串", () => {
    const result = formatPdfPage("季度报告", "全院缺陷率2%");
    expect(result).toContain("季度报告");
    expect(result).toContain("全院缺陷率2%");
  });
});

describe("buildExportPdf 年度总结 A3", () => {
  // 手算：title='年度总结', pageSize='A3' → 正确构建
  it("title='年度总结', pageSize='A3' → 正确构建", () => {
    const config: ExportPdfV14 = buildExportPdf("年度总结", "A3");
    expect(config.title).toBe("年度总结");
    expect(config.pageSize).toBe("A3");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-export-pdf auth:true", () => {
    const def = (emrQcExportPdfV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-export-pdf");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
