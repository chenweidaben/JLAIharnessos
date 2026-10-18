/**
 * 健澜科技 jlmedaios - 病历缺陷自动分类 V14 单测（M470-C）
 *
 * 测试 classifyDefect 关键词匹配+置信度、POST /defect-classifier auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClassificationSummary,
  classifyDefect,
  type ClassificationResultV14,
} from "../../src/bff/aggregators/emrDefectClassifierV14Aggregator";
import { emrDefectClassifierV14Routes } from "../../src/bff/routes/emrDefectClassifierV14";
import type { RouteDef } from "../../src/bff/types";

describe("classifyDefect 完整性缺失", () => {
  // 手算：text="主诉缺失" → 匹配"完整性缺失"类
  // 该类关键词：主诉/现病史/缺失/未写（共 4 个）
  // 命中：主诉（✓）、缺失（✓）→ 命中数=2
  // confidence = 2/4 = 0.5
  it("text='主诉缺失' → category='完整性缺失'", () => {
    const result = classifyDefect("主诉缺失");
    expect(result.category).toBe("完整性缺失");
  });
});

describe("classifyDefect 逻辑矛盾", () => {
  // 手算：text="诊断与症状矛盾" → 匹配"逻辑矛盾"类
  // 该类关键词：矛盾/不符/不一致（共 3 个）
  // 命中：矛盾（✓）→ 命中数=1
  // confidence = 1/3 ≈ 0.3
  it("text='诊断与症状矛盾' → category='逻辑矛盾'", () => {
    const result = classifyDefect("诊断与症状矛盾");
    expect(result.category).toBe("逻辑矛盾");
  });
});

describe("classifyDefect 未分类", () => {
  // 手算：text="未知内容xyz" → 无任何关键词命中
  // 返回 { category: '未分类', confidence: 0 }
  it("text='未知内容xyz' → category='未分类'，confidence=0", () => {
    const result = classifyDefect("未知内容xyz");
    expect(result.category).toBe("未分类");
    expect(result.confidence).toBe(0);
  });
});

describe("classifyDefect 置信度>0", () => {
  // 手算：命中关键词时 confidence>0
  it("命中关键词时 confidence>0", () => {
    const result: ClassificationResultV14 = classifyDefect("主诉缺失");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("POST /defect-classifier auth:true", () => {
  it("POST /api/v1/emr-defect-classifier auth:true", () => {
    const def = (emrDefectClassifierV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-defect-classifier");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
