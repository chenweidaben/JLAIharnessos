/**
 * 健澜科技 jlmedaios - 质控数据导出 CSV V14 单测（M497-C）
 *
 * 测试 buildExportCsv 构建、formatCsvRow 格式化、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExportCsv,
  formatCsvRow,
  type ExportCsvV14,
} from "../../src/bff/aggregators/emrQcExportCsvV14Aggregator";
import { emrQcExportCsvV14Routes } from "../../src/bff/routes/emrQcExportCsvV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExportCsv 逗号分隔", () => {
  // 手算：filename='质控数据.csv', delimiter=',' → 正确构建
  it("filename='质控数据.csv', delimiter=',' → 正确构建", () => {
    const config: ExportCsvV14 = buildExportCsv("质控数据.csv", ",");
    expect(config.filename).toBe("质控数据.csv");
    expect(config.delimiter).toBe(",");
  });
});

describe("formatCsvRow 逗号连接", () => {
  // 手算：row=['内科','5','92'], delimiter=',' → 返回 '内科,5,92\n'（逗号连接+换行）
  it("row=['内科','5','92'], delimiter=',' → 返回 '内科,5,92\\n'", () => {
    const row = ["内科", "5", "92"];
    const result = formatCsvRow(row, ",");
    expect(result).toBe("内科,5,92\n");
  });
});

describe("formatCsvRow 分号连接", () => {
  // 手算：row=['外科','3','95'], delimiter=';' → 返回 '外科;3;95\n'（分号连接+换行）
  it("row=['外科','3','95'], delimiter=';' → 返回 '外科;3;95\\n'", () => {
    const row = ["外科", "3", "95"];
    const result = formatCsvRow(row, ";");
    expect(result).toBe("外科;3;95\n");
  });
});

describe("buildExportCsv 制表符", () => {
  // 手算：filename='月报.csv', delimiter='\t' → 正确构建
  it("filename='月报.csv', delimiter='\\t' → 正确构建", () => {
    const config: ExportCsvV14 = buildExportCsv("月报.csv", "\t");
    expect(config.filename).toBe("月报.csv");
    expect(config.delimiter).toBe("\t");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-export-csv auth:true", () => {
    const def = (emrQcExportCsvV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-export-csv");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
