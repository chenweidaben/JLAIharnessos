/**
 * 健澜科技 jlmedaios - 环节质控 V14 单测（M481-B）
 *
 * 测试 buildStageQc 构建、evaluateStageQuality 评分、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStageQc,
  evaluateStageQuality,
  type StageQcItemV14,
  type StageQcV14,
} from "../../src/bff/aggregators/emrStageQcV14Aggregator";
import { emrStageQcV14Routes } from "../../src/bff/routes/emrStageQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStageQc 构建", () => {
  // 手算：stageName='入院记录', dept='内科' → 正确构建
  it("stageName=入院记录, dept=内科 → 正确构建", () => {
    const record: StageQcV14 = buildStageQc("入院记录", "内科");
    expect(record.stageName).toBe("入院记录");
    expect(record.dept).toBe("内科");
  });
});

describe("evaluateStageQuality avg=90.0", () => {
  // 手算：3 项分数 90/85/95 → (90+85+95)/3 = 270/3 = 90.0
  it("3 项分数 90/85/95 → avg=90.0", () => {
    const items: StageQcItemV14[] = [
      { name: "入院记录", score: 90 },
      { name: "首次病程", score: 85 },
      { name: "日常病程", score: 95 },
    ];
    const result = evaluateStageQuality(items);
    expect(result.avgScore).toBeCloseTo(90.0);
  });
});

describe("evaluateStageQuality passed=true", () => {
  // 手算：avg=90.0 → >=80 → passed=true
  it("avg=90.0 → passed=true", () => {
    const items: StageQcItemV14[] = [
      { name: "入院记录", score: 90 },
      { name: "首次病程", score: 85 },
      { name: "日常病程", score: 95 },
    ];
    const result = evaluateStageQuality(items);
    expect(result.passed).toBe(true);
  });
});

describe("evaluateStageQuality passed=false", () => {
  // 手算：3 项分数 60/70/65 → (60+70+65)/3 = 195/3 = 65.0 → <80 → passed=false
  it("3 项分数 60/70/65 → avg=65.0 → passed=false", () => {
    const items: StageQcItemV14[] = [
      { name: "入院记录", score: 60 },
      { name: "首次病程", score: 70 },
      { name: "日常病程", score: 65 },
    ];
    const result = evaluateStageQuality(items);
    expect(result.avgScore).toBeCloseTo(65.0);
    expect(result.passed).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-stage-qc auth:true", () => {
    const def = (emrStageQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-stage-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
