/**
 * 健澜科技 jlmedaios - 病历内涵质控 V14 单测（M477-A）
 *
 * 测试 runIntrinsicQc 关键词命中、scoreIntrinsicQuality 得分计算、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  runIntrinsicQc,
  scoreIntrinsicQuality,
  type IntrinsicQcResultV14,
} from "../../src/bff/aggregators/emrIntrinsicQcV14Aggregator";
import { emrIntrinsicQcV14Routes } from "../../src/bff/routes/emrIntrinsicQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("runIntrinsicQc 含关键词", () => {
  // 手算：含"主诉""现病史""诊断"3 个关键词 → hits>=3
  it("含'主诉''现病史''诊断'关键词 → hits>=3", () => {
    const content = "患者主诉发热 3 天，现病史记录体温变化，诊断为上呼吸道感染。";
    const result = runIntrinsicQc(content);
    expect(result.hits).toBeGreaterThanOrEqual(3);
  });
});

describe("runIntrinsicQc 空白内容", () => {
  // 手算：空白内容 → hits=0
  it("空白内容 → hits=0", () => {
    const result = runIntrinsicQc("");
    expect(result.hits).toBe(0);
  });
});

describe("scoreIntrinsicQuality 3/5", () => {
  // 手算：hits=3, totalKeywords=5 → score = 3/5×100 = 60
  it("hits=3, totalKeywords=5 → score=60", () => {
    expect(scoreIntrinsicQuality(3, 5)).toBe(60);
  });
});

describe("scoreIntrinsicQuality 5/5", () => {
  // 手算：hits=5, totalKeywords=5 → score = 5/5×100 = 100
  it("hits=5, totalKeywords=5 → score=100", () => {
    expect(scoreIntrinsicQuality(5, 5)).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-intrinsic-qc auth:true", () => {
    const def = (emrIntrinsicQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-intrinsic-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
