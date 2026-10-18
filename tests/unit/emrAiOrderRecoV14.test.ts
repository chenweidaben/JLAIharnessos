/**
 * 健澜科技 jlmedaios - 病历AI医嘱推荐 V14 单测（M546-B）
 *
 * 测试 buildAiOrderReco 构建 AI 医嘱推荐、recommendOrderByAi AI 医嘱推荐、buildAiOrderRecoReport 构建医嘱报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOrderReco,
  buildAiOrderRecoReport,
  recommendOrderByAi,
  type AiOrderRecoInputV14,
} from "../../src/bff/aggregators/emrAiOrderRecoV14Aggregator";
import { emrAiOrderRecoV14Routes } from "../../src/bff/routes/emrAiOrderRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOrderReco 构建 AI 医嘱推荐", () => {
  // 手算：recordId='RECB006', dept='心内科' → 正确构建
  it("recordId='RECB006', dept='心内科' → 正确构建", () => {
    const base = buildAiOrderReco("RECB006", "心内科");
    expect(base.recordId).toBe("RECB006");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendOrderByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗'}
  // 手算：diagnosis.includes('心梗') → true → orders=['阿司匹林100mg qd','他汀20mg qn','硝酸甘油0.5mg prn']
  // 手算：count = orders.length = 3
  it("{diagnosis='急性心梗'} → orders=['阿司匹林100mg qd','他汀20mg qn','硝酸甘油0.5mg prn'], count=3", () => {
    const input: AiOrderRecoInputV14 = { diagnosis: "急性心梗" };
    const result = recommendOrderByAi(input);
    expect(result.orders).toEqual(["阿司匹林100mg qd", "他汀20mg qn", "硝酸甘油0.5mg prn"]);
    expect(result.count).toBe(3);
  });
});

describe("recommendOrderByAi 一般", () => {
  // 手算：{diagnosis='上感'}
  // 手算：diagnosis.includes('心梗') → false → orders=['对症治疗医嘱']
  // 手算：count = orders.length = 1
  it("{diagnosis='上感'} → orders=['对症治疗医嘱'], count=1", () => {
    const input: AiOrderRecoInputV14 = { diagnosis: "上感" };
    const result = recommendOrderByAi(input);
    expect(result.orders).toEqual(["对症治疗医嘱"]);
    expect(result.count).toBe(1);
  });
});

describe("buildAiOrderRecoReport 构建医嘱报告", () => {
  // 手算：{orders=[3条], count=3}
  // 手算：透传 orders + count
  it("{orders=[3条], count=3} → 正确返回（透传）", () => {
    const report = buildAiOrderRecoReport({
      orders: ["阿司匹林100mg qd", "他汀20mg qn", "硝酸甘油0.5mg prn"],
      count: 3,
    });
    expect(report.orders).toEqual(["阿司匹林100mg qd", "他汀20mg qn", "硝酸甘油0.5mg prn"]);
    expect(report.count).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-order-reco auth:true", () => {
    const def = (emrAiOrderRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-order-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
