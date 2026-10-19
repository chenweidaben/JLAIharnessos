/**
 * 健澜科技 jlmedaios - 病历AI膳食处方推荐 V14 单测（M564-B）
 *
 * 测试 buildAiDietScriptReco 构建 AI 膳食处方推荐、recommendDietScriptByAi AI 膳食处方推荐、buildAiDietScriptRecoReport 构建膳食处方推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDietScriptReco,
  buildAiDietScriptRecoReport,
  recommendDietScriptByAi,
  type AiDietScriptRecoInputV14,
} from "../../src/bff/aggregators/emrAiDietScriptRecoV14Aggregator";
import { emrAiDietScriptRecoV14Routes } from "../../src/bff/routes/emrAiDietScriptRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDietScriptReco 构建 AI 膳食处方推荐", () => {
  // 手算：recordId='RECB079', dept='营养科' → 正确构建
  it("recordId='RECB079', dept='营养科' → 正确构建", () => {
    const base = buildAiDietScriptReco("RECB079", "营养科");
    expect(base.recordId).toBe("RECB079");
    expect(base.dept).toBe("营养科");
  });
});

describe("recommendDietScriptByAi 糖尿病", () => {
  // 手算：{disease='2型糖尿病', calorieNeeds=1800}
  // 手算：dietType = '2型糖尿病'.includes('糖尿病')=true → '糖尿病饮食'
  // 手算：nutritionRatio = 1800>=2000=false → '常规热量配比'
  it("{disease='2型糖尿病', calorieNeeds=1800} → dietType='糖尿病饮食', nutritionRatio='常规热量配比'", () => {
    const input: AiDietScriptRecoInputV14 = { disease: "2型糖尿病", calorieNeeds: 1800 };
    const result = recommendDietScriptByAi(input);
    expect(result.dietType).toBe("糖尿病饮食");
    expect(result.nutritionRatio).toBe("常规热量配比");
  });
});

describe("recommendDietScriptByAi 肾病高热量", () => {
  // 手算：{disease='慢性肾病', calorieNeeds=2200}
  // 手算：dietType = includes('糖尿病')=false, includes('肾病')=true → '低蛋白饮食'
  // 手算：nutritionRatio = 2200>=2000=true → '高蛋白高热量'
  it("{disease='慢性肾病', calorieNeeds=2200} → dietType='低蛋白饮食', nutritionRatio='高蛋白高热量'", () => {
    const input: AiDietScriptRecoInputV14 = { disease: "慢性肾病", calorieNeeds: 2200 };
    const result = recommendDietScriptByAi(input);
    expect(result.dietType).toBe("低蛋白饮食");
    expect(result.nutritionRatio).toBe("高蛋白高热量");
  });
});

describe("buildAiDietScriptRecoReport 构建膳食处方推荐报告", () => {
  // 手算：{dietType='糖尿病饮食', nutritionRatio='常规热量配比'}
  // 手算：透传 dietType + nutritionRatio
  it("{dietType='糖尿病饮食', nutritionRatio='常规热量配比'} → 正确返回（透传）", () => {
    const report = buildAiDietScriptRecoReport({ dietType: "糖尿病饮食", nutritionRatio: "常规热量配比" });
    expect(report.dietType).toBe("糖尿病饮食");
    expect(report.nutritionRatio).toBe("常规热量配比");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-diet-script-reco auth:true", () => {
    const def = (emrAiDietScriptRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-diet-script-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
