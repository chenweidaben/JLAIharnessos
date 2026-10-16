/**
 * 健澜科技 jlmedaios - 临床营养与膳食治疗 V5 单测（M272-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClinicalNutritionV5Report,
  prescribeEnteralV5,
  screenNutritionV5,
} from "../../src/bff/aggregators/clinicalNutritionV5ReportAggregator";

describe("screenNutritionV5", () => {
  it("NRS=5 BMI=18 摄入50%→高风险", () => {
    expect(screenNutritionV5(5, 18, 50).atRisk).toBe(true);
    expect(screenNutritionV5(5, 18, 50).level).toBe("高风险");
  });
});

describe("prescribeEnteralV5", () => {
  it("鼻胃管→30ml/h起始", () => {
    expect(prescribeEnteralV5("张三", "nasogastric").rate).toBe("30ml/h起始");
  });
});

describe("buildClinicalNutritionV5Report", () => {
  it("生成筛查数据", () => {
    expect(buildClinicalNutritionV5Report("30d").screening.nrs2002).toBeGreaterThan(0);
  });
  it("生成肠内营养数据", () => {
    expect(buildClinicalNutritionV5Report("30d").enteral.ons).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildClinicalNutritionV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
