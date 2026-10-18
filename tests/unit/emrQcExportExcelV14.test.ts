/**
 * 健澜科技 jlmedaios - 质控数据导出 Excel V14 单测（M497-A）
 *
 * 测试 buildExportExcel 构建、formatExcelRow 格式化、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExportExcel,
  formatExcelRow,
  type ExportExcelV14,
} from "../../src/bff/aggregators/emrQcExportExcelV14Aggregator";
import { emrQcExportExcelV14Routes } from "../../src/bff/routes/emrQcExportExcelV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExportExcel 病历质控月报", () => {
  // 手算：title='病历质控月报', columns=['科室','缺陷数','评分'] → 正确构建
  it("title='病历质控月报', columns=['科室','缺陷数','评分'] → 正确构建", () => {
    const config: ExportExcelV14 = buildExportExcel("病历质控月报", ["科室", "缺陷数", "评分"]);
    expect(config.title).toBe("病历质控月报");
    expect(config.columns).toEqual(["科室", "缺陷数", "评分"]);
  });
});

describe("formatExcelRow 完整列", () => {
  // 手算：row={科室:'内科',缺陷数:'5',评分:'92'}, columns=['科室','缺陷数','评分'] → 返回 ['内科','5','92']
  it("row={科室:'内科',缺陷数:'5',评分:'92'}, columns=['科室','缺陷数','评分'] → 返回 ['内科','5','92']", () => {
    const row = { 科室: "内科", 缺陷数: "5", 评分: "92" };
    const columns = ["科室", "缺陷数", "评分"];
    const result = formatExcelRow(row, columns);
    expect(result).toEqual(["内科", "5", "92"]);
  });
});

describe("formatExcelRow 部分列", () => {
  // 手算：row={科室:'外科',缺陷数:'3',评分:'95'}, columns=['科室','评分'] → 返回 ['外科','95']（只取指定列）
  it("row={科室:'外科',缺陷数:'3',评分:'95'}, columns=['科室','评分'] → 返回 ['外科','95']", () => {
    const row = { 科室: "外科", 缺陷数: "3", 评分: "95" };
    const columns = ["科室", "评分"];
    const result = formatExcelRow(row, columns);
    expect(result).toEqual(["外科", "95"]);
  });
});

describe("buildExportExcel 季度报告", () => {
  // 手算：title='季度报告', columns=['指标','数值'] → 正确构建
  it("title='季度报告', columns=['指标','数值'] → 正确构建", () => {
    const config: ExportExcelV14 = buildExportExcel("季度报告", ["指标", "数值"]);
    expect(config.title).toBe("季度报告");
    expect(config.columns).toEqual(["指标", "数值"]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-export-excel auth:true", () => {
    const def = (emrQcExportExcelV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-export-excel");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
