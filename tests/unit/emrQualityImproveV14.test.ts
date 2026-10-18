/**
 * 健澜科技 jlmedaios - 病历质量改进建议 V14 单测（M536-D）
 *
 * 测试 buildQualityImprove 构建改进建议、suggestQualityImprovement 改进建议生成、buildQualityImproveReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQualityImprove,
  buildQualityImproveReport,
  suggestQualityImprovement,
  type QualityImproveInputV14,
} from "../../src/bff/aggregators/emrQualityImproveV14Aggregator";
import { emrQualityImproveV14Routes } from "../../src/bff/routes/emrQualityImproveV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQualityImprove 构建改进建议", () => {
  // 手算：dept='心内科', recordId='REC303' → 正确构建
  it("dept='心内科', recordId='REC303' → 正确构建", () => {
    const improve = buildQualityImprove("心内科", "REC303");
    expect(improve.dept).toBe("心内科");
    expect(improve.recordId).toBe("REC303");
  });
});

describe("suggestQualityImprovement 高优先级", () => {
  // 手算：{score=60, block=1, major=2, minor=3}
  // 手算：block=1>0 → 加入'存在阻断项，需立即整改'
  // 手算：major=2>0 → 加入'存在主要缺陷，需限期整改'
  // 手算：minor=3>0 → 加入'存在次要缺陷，建议优化'
  // 手算：priority = block=1>0 → '高'
  it("{score=60, block=1, major=2, minor=3} → suggestions 3条, priority='高'", () => {
    const input: QualityImproveInputV14 = { score: 60, block: 1, major: 2, minor: 3 };
    const result = suggestQualityImprovement(input);
    expect(result.suggestions).toEqual([
      "存在阻断项，需立即整改",
      "存在主要缺陷，需限期整改",
      "存在次要缺陷，建议优化",
    ]);
    expect(result.priority).toBe("高");
  });
});

describe("suggestQualityImprovement 低优先级", () => {
  // 手算：{score=95, block=0, major=0, minor=1}
  // 手算：block=0>0? false → 不加入
  // 手算：major=0>0? false → 不加入
  // 手算：minor=1>0 → 加入'存在次要缺陷，建议优化'
  // 手算：priority = block=0, major=0 → '低'
  it("{score=95, block=0, major=0, minor=1} → suggestions=['存在次要缺陷，建议优化'], priority='低'", () => {
    const input: QualityImproveInputV14 = { score: 95, block: 0, major: 0, minor: 1 };
    const result = suggestQualityImprovement(input);
    expect(result.suggestions).toEqual(["存在次要缺陷，建议优化"]);
    expect(result.priority).toBe("低");
  });
});

describe("buildQualityImproveReport 构建报告", () => {
  // 手算：{suggestions=['存在阻断项，需立即整改','存在主要缺陷，需限期整改','存在次要缺陷，建议优化'], priority='高'}
  // 手算：透传 suggestions + priority
  it("高优先级建议 → 正确返回（透传）", () => {
    const report = buildQualityImproveReport({
      suggestions: ["存在阻断项，需立即整改", "存在主要缺陷，需限期整改", "存在次要缺陷，建议优化"],
      priority: "高",
    });
    expect(report.suggestions).toEqual([
      "存在阻断项，需立即整改",
      "存在主要缺陷，需限期整改",
      "存在次要缺陷，建议优化",
    ]);
    expect(report.priority).toBe("高");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-quality-improve auth:true", () => {
    const def = (emrQualityImproveV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-quality-improve");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
