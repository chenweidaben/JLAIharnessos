/**
 * 健澜科技 jlmedaios - 质控科室改进建议 V14 单测（M501-C）
 *
 * 测试 suggestDeptImprove 建议生成、buildImproveReport 构建报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildImproveReport,
  suggestDeptImprove,
  type ImproveReportV14,
  type ImproveSuggestResultV14,
} from "../../src/bff/aggregators/emrQcDeptImproveSuggestV14Aggregator";
import { emrQcDeptImproveSuggestV14Routes } from "../../src/bff/routes/emrQcDeptImproveSuggestV14";
import type { RouteDef } from "../../src/bff/types";

describe("suggestDeptImprove 低分科室", () => {
  // 手算：dept='外科', score=75 → suggestions 包含'加强培训'（<80 → 加强培训类建议）
  it("dept='外科', score=75 → suggestions 包含'加强培训'", () => {
    const result: ImproveSuggestResultV14 = suggestDeptImprove("外科", 75);
    expect(result.suggestions).toContain("加强病历书写培训");
  });
});

describe("suggestDeptImprove 中分科室", () => {
  // 手算：dept='内科', score=85 → suggestions 包含'重点改进'（80-90 → 重点改进类建议）
  it("dept='内科', score=85 → suggestions 包含'重点改进'", () => {
    const result: ImproveSuggestResultV14 = suggestDeptImprove("内科", 85);
    expect(result.suggestions).toContain("重点改进薄弱环节");
  });
});

describe("buildImproveReport 两条建议", () => {
  // 手算：{dept='外科', suggestions:['加强培训','完善流程']} → count=2（数组长度）
  it("{dept='外科', suggestions:['加强培训','完善流程']} → count=2", () => {
    const report: ImproveReportV14 = buildImproveReport({
      dept: "外科",
      suggestions: ["加强培训", "完善流程"],
    });
    expect(report.count).toBe(2);
    expect(report.suggestions.length).toBe(2);
  });
});

describe("buildImproveReport 空数组", () => {
  // 手算：{dept='儿科', suggestions:[]} → count=0（空数组长度）
  it("{dept='儿科', suggestions:[]} → count=0", () => {
    const report: ImproveReportV14 = buildImproveReport({ dept: "儿科", suggestions: [] });
    expect(report.count).toBe(0);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-dept-improve-suggest auth:true", () => {
    const def = (emrQcDeptImproveSuggestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-dept-improve-suggest");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
