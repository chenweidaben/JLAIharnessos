/**
 * 健澜科技 jlmedaios - 病历完整性检查 V14 单测（M476-A）
 *
 * 测试 checkCompleteness 缺失字段识别、computeCompletenessScore 得分计算、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkCompleteness,
  computeCompletenessScore,
  type CompletenessResultV14,
  type EmrFieldV14,
} from "../../src/bff/aggregators/emrCompletenessCheckV14Aggregator";
import { emrCompletenessCheckV14Routes } from "../../src/bff/routes/emrCompletenessCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkCompleteness 3 已填 2 未填", () => {
  // 手算：5 字段，3 已填（姓名/性别/年龄）2 未填（主诉/现病史）→ missingFields 含 2 项
  it("5 字段，3 已填 2 未填 → missingFields 含 2 项", () => {
    const fields: EmrFieldV14[] = [
      { name: "姓名", filled: true },
      { name: "性别", filled: true },
      { name: "年龄", filled: true },
      { name: "主诉", filled: false },
      { name: "现病史", filled: false },
    ];
    const result = checkCompleteness(fields);
    expect(result.missingFields.length).toBe(2);
  });
});

describe("checkCompleteness 全填", () => {
  // 手算：5 字段全填 → missingFields=[]
  it("5 字段全填 → missingFields=[]", () => {
    const fields: EmrFieldV14[] = [
      { name: "姓名", filled: true },
      { name: "性别", filled: true },
      { name: "年龄", filled: true },
      { name: "主诉", filled: true },
      { name: "现病史", filled: true },
    ];
    const result = checkCompleteness(fields);
    expect(result.missingFields).toEqual([]);
  });
});

describe("computeCompletenessScore 3/5", () => {
  // 手算：filledCount=3, total=5 → score = 3/5×100 = 60
  it("filledCount=3, total=5 → score=60", () => {
    const result: CompletenessResultV14 = { missingFields: [], filledCount: 3, total: 5 };
    expect(computeCompletenessScore(result)).toBe(60);
  });
});

describe("computeCompletenessScore 5/5", () => {
  // 手算：filledCount=5, total=5 → score = 5/5×100 = 100
  it("filledCount=5, total=5 → score=100", () => {
    const result: CompletenessResultV14 = { missingFields: [], filledCount: 5, total: 5 };
    expect(computeCompletenessScore(result)).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-completeness-check auth:true", () => {
    const def = (emrCompletenessCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-completeness-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
