/**
 * 健澜科技 jlmedaios - 病历质量科室对比 V14 单测（M536-C）
 *
 * 测试 buildQualityCompare 构建科室对比、compareDeptQuality 科室对比、buildQualityCompareReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQualityCompare,
  buildQualityCompareReport,
  compareDeptQuality,
  type QualityCompareInputV14,
} from "../../src/bff/aggregators/emrQualityCompareV14Aggregator";
import { emrQualityCompareV14Routes } from "../../src/bff/routes/emrQualityCompareV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQualityCompare 构建科室对比", () => {
  // 手算：deptA='心内科', deptB='呼吸科' → 正确构建
  it("deptA='心内科', deptB='呼吸科' → 正确构建", () => {
    const compare = buildQualityCompare("心内科", "呼吸科");
    expect(compare.deptA).toBe("心内科");
    expect(compare.deptB).toBe("呼吸科");
  });
});

describe("compareDeptQuality A领先", () => {
  // 手算：{scoreA=92, scoreB=78}
  // 手算：diff = |92-78| = 14
  // 手算：betterDept = 92 >= 78 → 'A科室'
  it("{scoreA=92, scoreB=78} → diff=14.0, betterDept='A科室'", () => {
    const input: QualityCompareInputV14 = { scoreA: 92, scoreB: 78 };
    const result = compareDeptQuality(input);
    expect(result.diff).toBe(14);
    expect(result.betterDept).toBe("A科室");
  });
});

describe("compareDeptQuality B领先", () => {
  // 手算：{scoreA=65, scoreB=85}
  // 手算：diff = |65-85| = 20
  // 手算：betterDept = 65 >= 85? false → 'B科室'
  it("{scoreA=65, scoreB=85} → diff=20.0, betterDept='B科室'", () => {
    const input: QualityCompareInputV14 = { scoreA: 65, scoreB: 85 };
    const result = compareDeptQuality(input);
    expect(result.diff).toBe(20);
    expect(result.betterDept).toBe("B科室");
  });
});

describe("buildQualityCompareReport 构建报告", () => {
  // 手算：{diff=14.0, betterDept='A科室'}
  // 手算：透传 diff + betterDept
  it("{diff=14.0, betterDept='A科室'} → 正确返回（透传）", () => {
    const report = buildQualityCompareReport({ diff: 14, betterDept: "A科室" });
    expect(report.diff).toBe(14);
    expect(report.betterDept).toBe("A科室");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-quality-compare auth:true", () => {
    const def = (emrQualityCompareV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-quality-compare");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
