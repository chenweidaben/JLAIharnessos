/**
 * 健澜科技 jlmedaios - 病历结构化数据导出 V14 单测（M532-B）
 *
 * 测试 buildStructExport 构建导出、exportStructData 导出结构化数据、buildStructExportReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStructExport,
  buildStructExportReport,
  exportStructData,
  type StructExportInputV14,
} from "../../src/bff/aggregators/emrStructExportV14Aggregator";
import { emrStructExportV14Routes } from "../../src/bff/routes/emrStructExportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStructExport 构建导出", () => {
  // 手算：recordType='入院记录', format='CSV' → 正确构建
  it("recordType='入院记录', format='CSV' → 正确构建", () => {
    const exp = buildStructExport("入院记录", "CSV");
    expect(exp.recordType).toBe("入院记录");
    expect(exp.format).toBe("CSV");
  });
});

describe("exportStructData 导出100条", () => {
  // 手算：{recordCount:100, format:'JSON'}
  // 手算：exportedCount = recordCount = 100
  // 手算：fileSizeKB = Math.ceil(100*0.5) = Math.ceil(50) = 50
  it("{recordCount:100, format:'JSON'} → exportedCount=100, fileSizeKB=50", () => {
    const input: StructExportInputV14 = { recordCount: 100, format: "JSON" };
    const result = exportStructData(input);
    expect(result.exportedCount).toBe(100);
    expect(result.fileSizeKB).toBe(50);
  });
});

describe("exportStructData 导出250条", () => {
  // 手算：{recordCount:250, format:'Excel'}
  // 手算：exportedCount = 250
  // 手算：fileSizeKB = Math.ceil(250*0.5) = Math.ceil(125) = 125
  it("{recordCount:250, format:'Excel'} → exportedCount=250, fileSizeKB=125", () => {
    const input: StructExportInputV14 = { recordCount: 250, format: "Excel" };
    const result = exportStructData(input);
    expect(result.exportedCount).toBe(250);
    expect(result.fileSizeKB).toBe(125);
  });
});

describe("buildStructExportReport 构建报告", () => {
  // 手算：{exportedCount:100, fileSizeKB:50}
  // 手算：透传 exportedCount + fileSizeKB
  it("{exportedCount:100, fileSizeKB:50} → 正确返回（透传）", () => {
    const report = buildStructExportReport({ exportedCount: 100, fileSizeKB: 50 });
    expect(report.exportedCount).toBe(100);
    expect(report.fileSizeKB).toBe(50);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-struct-export auth:true", () => {
    const def = (emrStructExportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-struct-export");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
