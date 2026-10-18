/**
 * 健澜科技 jlmedaios - 病历结构化数据对比 V14 单测（M532-D，M532 收官）
 *
 * 测试 buildStructCompare 构建对比、compareStructRecords 结构化对比、buildStructCompareReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStructCompare,
  buildStructCompareReport,
  compareStructRecords,
  type StructCompareInputV14,
} from "../../src/bff/aggregators/emrStructCompareV14Aggregator";
import { emrStructCompareV14Routes } from "../../src/bff/routes/emrStructCompareV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStructCompare 构建对比", () => {
  // 手算：deptA='心内科', deptB='呼吸科' → 正确构建
  it("deptA='心内科', deptB='呼吸科' → 正确构建", () => {
    const compare = buildStructCompare("心内科", "呼吸科");
    expect(compare.deptA).toBe("心内科");
    expect(compare.deptB).toBe("呼吸科");
  });
});

describe("compareStructRecords A领先", () => {
  // 手算：{deptARate=92.0, deptBRate=78.0}
  // 手算：diff = Math.abs(92.0 - 78.0) = 14.0
  // 手算：betterDept = 92.0 >= 78.0 ? 'A科室' : 'B科室' = 'A科室'
  it("{deptARate=92.0, deptBRate=78.0} → diff=14.0, betterDept='A科室'", () => {
    const input: StructCompareInputV14 = { deptARate: 92.0, deptBRate: 78.0 };
    const result = compareStructRecords(input);
    expect(result.diff).toBeCloseTo(14.0, 1);
    expect(result.betterDept).toBe("A科室");
  });
});

describe("compareStructRecords B领先", () => {
  // 手算：{deptARate=65.0, deptBRate=85.0}
  // 手算：diff = Math.abs(65.0 - 85.0) = 20.0
  // 手算：betterDept = 65.0 >= 85.0 ? 'A科室' : 'B科室' = 'B科室'
  it("{deptARate=65.0, deptBRate=85.0} → diff=20.0, betterDept='B科室'", () => {
    const input: StructCompareInputV14 = { deptARate: 65.0, deptBRate: 85.0 };
    const result = compareStructRecords(input);
    expect(result.diff).toBeCloseTo(20.0, 1);
    expect(result.betterDept).toBe("B科室");
  });
});

describe("buildStructCompareReport 构建报告", () => {
  // 手算：{diff:14.0, betterDept:'A科室'}
  // 手算：透传 diff + betterDept
  it("{diff:14.0, betterDept:'A科室'} → 正确返回（透传）", () => {
    const report = buildStructCompareReport({ diff: 14.0, betterDept: "A科室" });
    expect(report.diff).toBe(14.0);
    expect(report.betterDept).toBe("A科室");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-struct-compare auth:true", () => {
    const def = (emrStructCompareV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-struct-compare");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
