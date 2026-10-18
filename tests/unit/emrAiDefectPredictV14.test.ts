/**
 * 健澜科技 jlmedaios - 病历AI缺陷预测 V14 单测（M543-C）
 *
 * 测试 buildAiDefectPredict 构建 AI 缺陷预测、predictDefectByAi AI 缺陷预测、buildAiDefectPredictReport 构建预测报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDefectPredict,
  buildAiDefectPredictReport,
  predictDefectByAi,
  type AiDefectPredictInputV14,
} from "../../src/bff/aggregators/emrAiDefectPredictV14Aggregator";
import { emrAiDefectPredictV14Routes } from "../../src/bff/routes/emrAiDefectPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDefectPredict 构建 AI 缺陷预测", () => {
  // 手算：recordId='REC902', dept='普外科' → 正确构建
  it("recordId='REC902', dept='普外科' → 正确构建", () => {
    const base = buildAiDefectPredict("REC902", "普外科");
    expect(base.recordId).toBe("REC902");
    expect(base.dept).toBe("普外科");
  });
});

describe("predictDefectByAi 高风险", () => {
  // 手算：{recordType='出院记录', hasSignature=false, hasDischarge=true}
  // 手算：riskLevel = !hasSignature ? '高' : ... → hasSignature=false → riskLevel='高'
  // 手算：predictedDefects = (!hasSignature ? 1 : 0) + (!hasDischarge ? 1 : 0) = 1 + 0 = 1
  it("{recordType='出院记录', hasSignature=false, hasDischarge=true} → riskLevel='高', predictedDefects=1", () => {
    const input: AiDefectPredictInputV14 = { recordType: "出院记录", hasSignature: false, hasDischarge: true };
    const result = predictDefectByAi(input);
    expect(result.riskLevel).toBe("高");
    expect(result.predictedDefects).toBe(1);
  });
});

describe("predictDefectByAi 低风险", () => {
  // 手算：{recordType='入院记录', hasSignature=true, hasDischarge=true}
  // 手算：riskLevel = !hasSignature ? '高' : !hasDischarge ? '中' : '低' → 都有 → riskLevel='低'
  // 手算：predictedDefects = (!hasSignature ? 1 : 0) + (!hasDischarge ? 1 : 0) = 0 + 0 = 0
  it("{recordType='入院记录', hasSignature=true, hasDischarge=true} → riskLevel='低', predictedDefects=0", () => {
    const input: AiDefectPredictInputV14 = { recordType: "入院记录", hasSignature: true, hasDischarge: true };
    const result = predictDefectByAi(input);
    expect(result.riskLevel).toBe("低");
    expect(result.predictedDefects).toBe(0);
  });
});

describe("buildAiDefectPredictReport 构建预测报告", () => {
  // 手算：{riskLevel='高', predictedDefects=1}
  // 手算：透传 riskLevel + predictedDefects
  it("{riskLevel='高', predictedDefects=1} → 正确返回（透传）", () => {
    const report = buildAiDefectPredictReport({ riskLevel: "高", predictedDefects: 1 });
    expect(report.riskLevel).toBe("高");
    expect(report.predictedDefects).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-defect-predict auth:true", () => {
    const def = (emrAiDefectPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-defect-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
