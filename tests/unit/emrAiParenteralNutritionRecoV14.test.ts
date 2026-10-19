/**
 * 健澜科技 jlmedaios - 病历AI肠外营养配置推荐 V14 单测（M564-D，M564 收官）
 *
 * 测试 buildAiParenteralNutritionReco 构建 AI 肠外营养配置推荐、recommendParenteralNutritionByAi AI 肠外营养配置推荐、buildAiParenteralNutritionRecoReport 构建肠外营养配置推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiParenteralNutritionReco,
  buildAiParenteralNutritionRecoReport,
  recommendParenteralNutritionByAi,
  type AiParenteralNutritionRecoInputV14,
} from "../../src/bff/aggregators/emrAiParenteralNutritionRecoV14Aggregator";
import { emrAiParenteralNutritionRecoV14Routes } from "../../src/bff/routes/emrAiParenteralNutritionRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiParenteralNutritionReco 构建 AI 肠外营养配置推荐", () => {
  // 手算：recordId='RECB081', dept='营养科' → 正确构建
  it("recordId='RECB081', dept='营养科' → 正确构建", () => {
    const base = buildAiParenteralNutritionReco("RECB081", "营养科");
    expect(base.recordId).toBe("RECB081");
    expect(base.dept).toBe("营养科");
  });
});

describe("recommendParenteralNutritionByAi 长期肝损", () => {
  // 手算：{days=10, hasLiverDysfunction=true}
  // 手算：aminoAcid = 10>=7 → '11.4%乐凡命'
  // 手算：lipid = hasLiverDysfunction=true → '鱼油脂肪乳'
  it("{days=10, hasLiverDysfunction=true} → aminoAcid='11.4%乐凡命', lipid='鱼油脂肪乳'", () => {
    const input: AiParenteralNutritionRecoInputV14 = { days: 10, hasLiverDysfunction: true };
    const result = recommendParenteralNutritionByAi(input);
    expect(result.aminoAcid).toBe("11.4%乐凡命");
    expect(result.lipid).toBe("鱼油脂肪乳");
  });
});

describe("recommendParenteralNutritionByAi 短期正常", () => {
  // 手算：{days=3, hasLiverDysfunction=false}
  // 手算：aminoAcid = 3>=7=false → '8.5%乐凡命'
  // 手算：lipid = hasLiverDysfunction=false → '20%脂肪乳剂'
  it("{days=3, hasLiverDysfunction=false} → aminoAcid='8.5%乐凡命', lipid='20%脂肪乳剂'", () => {
    const input: AiParenteralNutritionRecoInputV14 = { days: 3, hasLiverDysfunction: false };
    const result = recommendParenteralNutritionByAi(input);
    expect(result.aminoAcid).toBe("8.5%乐凡命");
    expect(result.lipid).toBe("20%脂肪乳剂");
  });
});

describe("buildAiParenteralNutritionRecoReport 构建肠外营养配置推荐报告", () => {
  // 手算：{aminoAcid='11.4%乐凡命', lipid='鱼油脂肪乳'}
  // 手算：透传 aminoAcid + lipid
  it("{aminoAcid='11.4%乐凡命', lipid='鱼油脂肪乳'} → 正确返回（透传）", () => {
    const report = buildAiParenteralNutritionRecoReport({ aminoAcid: "11.4%乐凡命", lipid: "鱼油脂肪乳" });
    expect(report.aminoAcid).toBe("11.4%乐凡命");
    expect(report.lipid).toBe("鱼油脂肪乳");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-parenteral-nutrition-reco auth:true", () => {
    const def = (emrAiParenteralNutritionRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-parenteral-nutrition-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
