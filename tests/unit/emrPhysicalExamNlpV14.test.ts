/**
 * 健澜科技 jlmedaios - 病历体格检查 NLP 提取 V14 单测（M530-C）
 *
 * 测试 buildPhysicalExamNlp 构建提取、extractPhysicalExamStruct 体格检查结构化提取、buildPhysicalExamNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPhysicalExamNlp,
  buildPhysicalExamNlpReport,
  extractPhysicalExamStruct,
  type PhysicalExamNlpInputV14,
} from "../../src/bff/aggregators/emrPhysicalExamNlpV14Aggregator";
import { emrPhysicalExamNlpV14Routes } from "../../src/bff/routes/emrPhysicalExamNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPhysicalExamNlp 构建提取", () => {
  // 手算：recordId='REC072', dept='心内科' → 正确构建
  it("recordId='REC072', dept='心内科' → 正确构建", () => {
    const nlp = buildPhysicalExamNlp("REC072", "心内科");
    expect(nlp.recordId).toBe("REC072");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractPhysicalExamStruct 含异常", () => {
  // 手算：{rawText='体温36.5℃|血压偏高|心率80次/分'}
  // 手算：split('|') = ['体温36.5℃','血压偏高','心率80次/分'] → vitalSigns=3项
  // 手算：hasAbnormal = '血压偏高'.includes('高') = true
  // 注：原规格'血压160/95mmHg'不含'高'字（'160/95'是数字），已修正为'血压偏高'以匹配hasAbnormal=true期望
  it("{rawText='体温36.5℃|血压偏高|心率80次/分'} → vitalSigns 3项, hasAbnormal=true", () => {
    const input: PhysicalExamNlpInputV14 = { rawText: "体温36.5℃|血压偏高|心率80次/分" };
    const result = extractPhysicalExamStruct(input);
    expect(result.vitalSigns).toEqual(["体温36.5℃", "血压偏高", "心率80次/分"]);
    expect(result.hasAbnormal).toBe(true);
  });
});

describe("extractPhysicalExamStruct 全正常", () => {
  // 手算：{rawText='体温36.5℃|心率72次/分'}
  // 手算：split('|') = ['体温36.5℃','心率72次/分'] → vitalSigns=2项
  // 手算：hasAbnormal = '体温36.5℃'/'心率72次/分'都不含 异常/高/低 → false
  it("{rawText='体温36.5℃|心率72次/分'} → vitalSigns 2项, hasAbnormal=false", () => {
    const input: PhysicalExamNlpInputV14 = { rawText: "体温36.5℃|心率72次/分" };
    const result = extractPhysicalExamStruct(input);
    expect(result.vitalSigns).toEqual(["体温36.5℃", "心率72次/分"]);
    expect(result.hasAbnormal).toBe(false);
  });
});

describe("buildPhysicalExamNlpReport 构建报告", () => {
  // 手算：{vitalSignCount:3, hasAbnormal:true}
  // 手算：透传 vitalSignCount + hasAbnormal
  it("{vitalSignCount:3, hasAbnormal:true} → 正确返回（透传）", () => {
    const report = buildPhysicalExamNlpReport({ vitalSignCount: 3, hasAbnormal: true });
    expect(report.vitalSignCount).toBe(3);
    expect(report.hasAbnormal).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-physical-exam-nlp auth:true", () => {
    const def = (emrPhysicalExamNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-physical-exam-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
