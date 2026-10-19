/**
 * 健澜科技 jlmedaios - 病历AI出院小结自动生成 V14 单测（M555-D，M555 收官）
 *
 * 测试 buildAiDischargeSummaryGen 构建 AI 出院小结自动生成、genDischargeSummaryByAi AI 出院小结自动生成、buildAiDischargeSummaryGenReport 构建出院小结生成报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDischargeSummaryGen,
  buildAiDischargeSummaryGenReport,
  genDischargeSummaryByAi,
  type AiDischargeSummaryGenInputV14,
} from "../../src/bff/aggregators/emrAiDischargeSummaryGenV14Aggregator";
import { emrAiDischargeSummaryGenV14Routes } from "../../src/bff/routes/emrAiDischargeSummaryGenV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDischargeSummaryGen 构建 AI 出院小结自动生成", () => {
  // 手算：recordId='RECB044', dept='外科' → 正确构建
  it("recordId='RECB044', dept='外科' → 正确构建", () => {
    const base = buildAiDischargeSummaryGen("RECB044", "外科");
    expect(base.recordId).toBe("RECB044");
    expect(base.dept).toBe("外科");
  });
});

describe("genDischargeSummaryByAi 手术", () => {
  // 手算：{diagnosis='急性阑尾炎', opName='阑尾切除术', dischargeDay=7}
  // 手算：summary = `患者因急性阑尾炎于住院期间行阑尾切除术，术后恢复顺利，住院7天出院。`
  // 手算：opName='阑尾切除术' ≠ '保守治疗' → advice='注意伤口护理，定期复查'
  it("{diagnosis='急性阑尾炎', opName='阑尾切除术', dischargeDay=7} → summary 含关键字段, advice='注意伤口护理，定期复查'", () => {
    const input: AiDischargeSummaryGenInputV14 = { diagnosis: "急性阑尾炎", opName: "阑尾切除术", dischargeDay: 7 };
    const result = genDischargeSummaryByAi(input);
    expect(result.summary).toContain("急性阑尾炎");
    expect(result.summary).toContain("阑尾切除术");
    expect(result.summary).toContain("住院7天出院");
    expect(result.advice).toBe("注意伤口护理，定期复查");
  });
});

describe("genDischargeSummaryByAi 保守", () => {
  // 手算：{diagnosis='急性胃炎', opName='保守治疗', dischargeDay=5}
  // 手算：summary = `患者因急性胃炎于住院期间行保守治疗，术后恢复顺利，住院5天出院。`
  // 手算：opName='保守治疗' → advice='按时服药，定期复查'
  it("{diagnosis='急性胃炎', opName='保守治疗', dischargeDay=5} → summary 含关键字段, advice='按时服药，定期复查'", () => {
    const input: AiDischargeSummaryGenInputV14 = { diagnosis: "急性胃炎", opName: "保守治疗", dischargeDay: 5 };
    const result = genDischargeSummaryByAi(input);
    expect(result.summary).toContain("急性胃炎");
    expect(result.summary).toContain("住院5天出院");
    expect(result.advice).toBe("按时服药，定期复查");
  });
});

describe("buildAiDischargeSummaryGenReport 构建出院小结生成报告", () => {
  // 手算：{summary='...', advice='...'}
  // 手算：透传 summary + advice
  it("{summary='测试小结', advice='测试医嘱'} → 正确返回（透传）", () => {
    const report = buildAiDischargeSummaryGenReport({ summary: "测试小结", advice: "测试医嘱" });
    expect(report.summary).toBe("测试小结");
    expect(report.advice).toBe("测试医嘱");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-discharge-summary-gen auth:true", () => {
    const def = (emrAiDischargeSummaryGenV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-discharge-summary-gen");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
