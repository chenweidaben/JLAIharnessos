/**
 * 健澜科技 jlmedaios - 质控指标导出 V14 单测（M484-D，M484 收官）
 *
 * 测试 buildExportTask 构建、generateCsvContent CSV 生成、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExportTask,
  generateCsvContent,
  type ExportTaskV14,
} from "../../src/bff/aggregators/emrQcMetricExportV14Aggregator";
import { emrQcMetricExportV14Routes } from "../../src/bff/routes/emrQcMetricExportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExportTask 构建", () => {
  // 手算：metricName='完整率', format='csv' → 正确构建
  it("metricName=完整率, format=csv → 正确构建", () => {
    const task: ExportTaskV14 = buildExportTask("完整率", "csv");
    expect(task.metricName).toBe("完整率");
    expect(task.format).toBe("csv");
  });
});

describe("generateCsvContent 2行", () => {
  // 手算：[{内科,95},{外科,85}] → CSV 含表头"科室,指标值"和 2 行数据
  it("[{dept:内科,value:95},{dept:外科,value:85}] → CSV 含表头和 2 行数据", () => {
    const rows = [
      { dept: "内科", value: 95 },
      { dept: "外科", value: 85 },
    ];
    const csv = generateCsvContent(rows);
    expect(csv).toContain("科室,指标值");
    expect(csv).toContain("内科,95");
    expect(csv).toContain("外科,85");
  });
});

describe("generateCsvContent 空数组", () => {
  // 手算：空数组 → CSV 含表头但无数据行
  it("空数组 → CSV 含表头但无数据行", () => {
    const rows: { dept: string; value: number }[] = [];
    const csv = generateCsvContent(rows);
    expect(csv).toBe("科室,指标值");
  });
});

describe("buildExportTask excel", () => {
  // 手算：format='excel' → 正确构建
  it("format=excel → 正确构建", () => {
    const task: ExportTaskV14 = buildExportTask("完整率", "excel");
    expect(task.format).toBe("excel");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-metric-export auth:true", () => {
    const def = (emrQcMetricExportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-metric-export");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
