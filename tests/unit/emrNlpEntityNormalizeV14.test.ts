/**
 * 健澜科技 jlmedaios - 病历 NLP 实体归一化 V14 单测（M531-A）
 *
 * 测试 buildNlpEntityNormalize 构建归一化、normalizeEntityToCode 实体归一化、buildNlpEntityNormalizeReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNlpEntityNormalize,
  buildNlpEntityNormalizeReport,
  normalizeEntityToCode,
  type NlpEntityNormalizeInputV14,
} from "../../src/bff/aggregators/emrNlpEntityNormalizeV14Aggregator";
import { emrNlpEntityNormalizeV14Routes } from "../../src/bff/routes/emrNlpEntityNormalizeV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNlpEntityNormalize 构建归一化", () => {
  // 手算：entityType='疾病', source='ICD-10' → 正确构建
  it("entityType='疾病', source='ICD-10' → 正确构建", () => {
    const nlp = buildNlpEntityNormalize("疾病", "ICD-10");
    expect(nlp.entityType).toBe("疾病");
    expect(nlp.source).toBe("ICD-10");
  });
});

describe("normalizeEntityToCode 命中", () => {
  // 手算：{rawEntity='冠心病', dictionary={'冠心病':'I25.1','高血压':'I10'}}
  // 手算：dictionary['冠心病'] = 'I25.1' → normalizedCode='I25.1'
  // 手算：matched = 'I25.1' !== 'UNKNOWN' = true
  it("{rawEntity='冠心病', dictionary={'冠心病':'I25.1','高血压':'I10'}} → normalizedCode='I25.1', matched=true", () => {
    const input: NlpEntityNormalizeInputV14 = {
      rawEntity: "冠心病",
      dictionary: { 冠心病: "I25.1", 高血压: "I10" },
    };
    const result = normalizeEntityToCode(input);
    expect(result.normalizedCode).toBe("I25.1");
    expect(result.matched).toBe(true);
  });
});

describe("normalizeEntityToCode 未命中", () => {
  // 手算：{rawEntity='感冒', dictionary={'冠心病':'I25.1','高血压':'I10'}}
  // 手算：dictionary['感冒'] = undefined → normalizedCode='UNKNOWN'
  // 手算：matched = 'UNKNOWN' !== 'UNKNOWN' = false
  it("{rawEntity='感冒', dictionary={'冠心病':'I25.1','高血压':'I10'}} → normalizedCode='UNKNOWN', matched=false", () => {
    const input: NlpEntityNormalizeInputV14 = {
      rawEntity: "感冒",
      dictionary: { 冠心病: "I25.1", 高血压: "I10" },
    };
    const result = normalizeEntityToCode(input);
    expect(result.normalizedCode).toBe("UNKNOWN");
    expect(result.matched).toBe(false);
  });
});

describe("buildNlpEntityNormalizeReport 构建报告", () => {
  // 手算：{matched:true, normalizedCode:'I25.1'}
  // 手算：透传 matched + normalizedCode
  it("{matched:true, normalizedCode:'I25.1'} → 正确返回（透传）", () => {
    const report = buildNlpEntityNormalizeReport({ normalizedCode: "I25.1", matched: true });
    expect(report.matched).toBe(true);
    expect(report.normalizedCode).toBe("I25.1");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-nlp-entity-normalize auth:true", () => {
    const def = (emrNlpEntityNormalizeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-nlp-entity-normalize");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
