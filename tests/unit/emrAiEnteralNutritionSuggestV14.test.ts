/**
 * 健澜科技 jlmedaios - 病历AI肠内营养支持建议 V14 单测（M564-C）
 *
 * 测试 buildAiEnteralNutritionSuggest 构建 AI 肠内营养支持建议、suggestEnteralNutritionByAi AI 肠内营养支持建议、buildAiEnteralNutritionSuggestReport 构建肠内营养支持建议报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiEnteralNutritionSuggest,
  buildAiEnteralNutritionSuggestReport,
  suggestEnteralNutritionByAi,
  type AiEnteralNutritionSuggestInputV14,
} from "../../src/bff/aggregators/emrAiEnteralNutritionSuggestV14Aggregator";
import { emrAiEnteralNutritionSuggestV14Routes } from "../../src/bff/routes/emrAiEnteralNutritionSuggestV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiEnteralNutritionSuggest 构建 AI 肠内营养支持建议", () => {
  // 手算：recordId='RECB080', dept='营养科' → 正确构建
  it("recordId='RECB080', dept='营养科' → 正确构建", () => {
    const base = buildAiEnteralNutritionSuggest("RECB080", "营养科");
    expect(base.recordId).toBe("RECB080");
    expect(base.dept).toBe("营养科");
  });
});

describe("suggestEnteralNutritionByAi 吞咽困难", () => {
  // 手算：{swallowing='困难', gutFunction='正常'}
  // 手算：formula = swallowing==='困难' → '整蛋白型肠内营养剂'
  // 手算：deliveryRoute = swallowing==='困难' → '鼻胃管'
  it("{swallowing='困难', gutFunction='正常'} → formula='整蛋白型肠内营养剂', deliveryRoute='鼻胃管'", () => {
    const input: AiEnteralNutritionSuggestInputV14 = { swallowing: "困难", gutFunction: "正常" };
    const result = suggestEnteralNutritionByAi(input);
    expect(result.formula).toBe("整蛋白型肠内营养剂");
    expect(result.deliveryRoute).toBe("鼻胃管");
  });
});

describe("suggestEnteralNutritionByAi 口服短肽", () => {
  // 手算：{swallowing='正常', gutFunction='正常'}
  // 手算：formula = swallowing!=='困难'；gutFunction==='正常' → '短肽型肠内营养剂'
  // 手算：deliveryRoute = swallowing!=='困难' → '口服'
  it("{swallowing='正常', gutFunction='正常'} → formula='短肽型肠内营养剂', deliveryRoute='口服'", () => {
    const input: AiEnteralNutritionSuggestInputV14 = { swallowing: "正常", gutFunction: "正常" };
    const result = suggestEnteralNutritionByAi(input);
    expect(result.formula).toBe("短肽型肠内营养剂");
    expect(result.deliveryRoute).toBe("口服");
  });
});

describe("buildAiEnteralNutritionSuggestReport 构建肠内营养支持建议报告", () => {
  // 手算：{formula='整蛋白型肠内营养剂', deliveryRoute='鼻胃管'}
  // 手算：透传 formula + deliveryRoute
  it("{formula='整蛋白型肠内营养剂', deliveryRoute='鼻胃管'} → 正确返回（透传）", () => {
    const report = buildAiEnteralNutritionSuggestReport({ formula: "整蛋白型肠内营养剂", deliveryRoute: "鼻胃管" });
    expect(report.formula).toBe("整蛋白型肠内营养剂");
    expect(report.deliveryRoute).toBe("鼻胃管");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-enteral-nutrition-suggest auth:true", () => {
    const def = (emrAiEnteralNutritionSuggestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-enteral-nutrition-suggest");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
