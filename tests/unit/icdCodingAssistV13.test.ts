/**
 * 健澜科技 jlmedaios - ICD 编码辅助推荐 V13 单测（M315-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCodingAccuracyV13,
  computeCodingHitRateV13,
  recommendIcdCodeV13,
  type CodingRecordV13,
  type IcdLibraryItemV13,
} from "../../src/bff/aggregators/icdCodingAssistV13Aggregator";
import { icdCodingAssistV13Routes } from "../../src/bff/routes/icdCodingAssistV13";

const library: IcdLibraryItemV13[] = [
  { code: "I21.9", keyword: "急性心肌梗死" },
  { code: "I10", keyword: "高血压" },
  { code: "E11.9", keyword: "2型糖尿病" },
];

const records: CodingRecordV13[] = [
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I10", correctMainCode: "I21.9", isRecommendationCorrect: false },
  { recommendedMainCode: "I10", correctMainCode: "I10", isRecommendationCorrect: true },
];

describe("recommendIcdCodeV13", () => {
  // 算式：诊断"急性心肌梗死合并高血压"匹配 2 个关键词（急性心肌梗死、高血压）
  // 主编码 = 第 1 个匹配 = I21.9；附加编码 = 第 2 个 = I10
  it("主编码=I21.9, 附加=[I10]", () => {
    const r = recommendIcdCodeV13("急性心肌梗死合并高血压", library);
    expect(r.mainCode).toBe("I21.9");
    expect(r.additionalCodes).toEqual(["I10"]);
  });
  it("无匹配 → 空", () => {
    expect(recommendIcdCodeV13("未知诊断", library).mainCode).toBe("");
  });
});

describe("computeCodingHitRateV13", () => {
  // 算式：10 记录中 9 个 isRecommendationCorrect=true（仅第 9 条 false）
  // hitRate = 9/10×100 = 90
  it("hitRate = 90", () => {
    expect(computeCodingHitRateV13(records)).toBe(90);
  });
  it("空态 → 0", () => {
    expect(computeCodingHitRateV13([])).toBe(0);
  });
});

describe("computeCodingAccuracyV13", () => {
  // 算式：10 记录中主编码正确数 = 9（第 9 条 recommended=I10, correct=I21.9 → 错）
  // accuracy = 9/10×100 = 90
  it("accuracy = 90", () => {
    expect(computeCodingAccuracyV13(records)).toBe(90);
  });
});

describe("icdCodingAssistV13Routes 读路由", () => {
  it("GET /api/v1/icd-coding-assist 路由存在且 auth:true", () => {
    const route = icdCodingAssistV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/icd-coding-assist",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
