/**
 * 健澜科技 jlmedaios - 病历AI出院小结生成 V14 单测（M547-A）
 *
 * 测试 buildAiDischargeSummary 构建 AI 出院小结、generateDischargeSummaryByAi AI 出院小结生成、buildAiDischargeSummaryReport 构建出院小结报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDischargeSummary,
  buildAiDischargeSummaryReport,
  generateDischargeSummaryByAi,
  type AiDischargeSummaryInputV14,
} from "../../src/bff/aggregators/emrAiDischargeSummaryV14Aggregator";
import { emrAiDischargeSummaryV14Routes } from "../../src/bff/routes/emrAiDischargeSummaryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDischargeSummary 构建 AI 出院小结", () => {
  // 手算：recordId='RECB009', dept='心内科' → 正确构建
  it("recordId='RECB009', dept='心内科' → 正确构建", () => {
    const base = buildAiDischargeSummary("RECB009", "心内科");
    expect(base.recordId).toBe("RECB009");
    expect(base.dept).toBe("心内科");
  });
});

describe("generateDischargeSummaryByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗', treatment='PCI手术'}
  // 手算：summary = `患者诊断为${diagnosis}，经${treatment}治疗后好转出院。`
  //       = '患者诊断为急性心梗，经PCI手术治疗后好转出院。'
  // 手算：逐字符数：患(1)者(2)诊(3)断(4)为(5)急(6)性(7)心(8)梗(9)，(10)经(11)P(12)C(13)I(14)手(15)术(16)治(17)疗(18)后(19)好(20)转(21)出(22)院(23)。(24)
  // 手算：length = 24
  it("{diagnosis='急性心梗', treatment='PCI手术'} → summary='患者诊断为急性心梗，经PCI手术治疗后好转出院。', length=24", () => {
    const input: AiDischargeSummaryInputV14 = { diagnosis: "急性心梗", treatment: "PCI手术" };
    const result = generateDischargeSummaryByAi(input);
    expect(result.summary).toBe("患者诊断为急性心梗，经PCI手术治疗后好转出院。");
    expect(result.length).toBe(24);
  });
});

describe("generateDischargeSummaryByAi 一般", () => {
  // 手算：{diagnosis='上呼吸道感染', treatment='抗感染'}
  // 手算：summary = `患者诊断为${diagnosis}，经${treatment}治疗后好转出院。`
  //       = '患者诊断为上呼吸道感染，经抗感染治疗后好转出院。'
  // 手算：逐字符数：患(1)者(2)诊(3)断(4)为(5)上(6)呼(7)吸(8)道(9)感(10)染(11)，(12)经(13)抗(14)感(15)染(16)治(17)疗(18)后(19)好(20)转(21)出(22)院(23)。(24)
  // 手算：length = 24
  it("{diagnosis='上呼吸道感染', treatment='抗感染'} → summary='患者诊断为上呼吸道感染，经抗感染治疗后好转出院。', length=24", () => {
    const input: AiDischargeSummaryInputV14 = { diagnosis: "上呼吸道感染", treatment: "抗感染" };
    const result = generateDischargeSummaryByAi(input);
    expect(result.summary).toBe("患者诊断为上呼吸道感染，经抗感染治疗后好转出院。");
    expect(result.length).toBe(24);
  });
});

describe("buildAiDischargeSummaryReport 构建出院小结报告", () => {
  // 手算：{summary='患者诊断为急性心梗，经PCI手术治疗后好转出院。', length=24}
  // 手算：透传 summary + length
  it("{summary='患者诊断为急性心梗，经PCI手术治疗后好转出院。', length=24} → 正确返回（透传）", () => {
    const report = buildAiDischargeSummaryReport({
      summary: "患者诊断为急性心梗，经PCI手术治疗后好转出院。",
      length: 24,
    });
    expect(report.summary).toBe("患者诊断为急性心梗，经PCI手术治疗后好转出院。");
    expect(report.length).toBe(24);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-discharge-summary auth:true", () => {
    const def = (emrAiDischargeSummaryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-discharge-summary");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
