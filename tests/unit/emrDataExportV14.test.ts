/**
 * 健澜科技 jlmedaios - 病历质控数据导出中心 V14 单测（M472-D，M472 收官）
 *
 * 测试 buildExportTask 创建、computeExportColumns 列映射、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExportTask,
  computeExportColumns,
  type ExportTaskV14,
} from "../../src/bff/aggregators/emrDataExportV14Aggregator";
import { emrDataExportV14Routes } from "../../src/bff/routes/emrDataExportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExportTask 创建", () => {
  // 手算：dataset='病历', columns=['病历号'] → status='pending'
  it("dataset='病历', columns=['病历号'] → status='pending'", () => {
    const task = buildExportTask("病历", ["病历号"]);
    expect(task.dataset).toBe("病历");
    expect(task.columns).toEqual(["病历号"]);
    expect(task.status).toBe("pending");
  });
});

describe("computeExportColumns 病历", () => {
  // 手算：dataset='病历' → 返回列数组含'病历号'
  it("dataset='病历' → 返回列数组含'病历号'", () => {
    const columns = computeExportColumns("病历");
    expect(columns).toContain("病历号");
  });
});

describe("computeExportColumns 列数", () => {
  // 手算：病历号/患者姓名/科室/诊断/质控得分/缺陷数 = 6 列
  it("dataset='病历' → 列数=6", () => {
    expect(computeExportColumns("病历").length).toBe(6);
  });
});

describe("buildExportTask 空 columns", () => {
  // 手算：空 columns → 返回 columns=[]
  it("空 columns → 返回 columns=[]", () => {
    const task: ExportTaskV14 = buildExportTask("病历", []);
    expect(task.columns).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-data-export/:taskId auth:true", () => {
    const def = (emrDataExportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-data-export/:taskId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
