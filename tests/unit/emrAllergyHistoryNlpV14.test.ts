/**
 * 健澜科技 jlmedaios - 病历过敏史 NLP 提取 V14 单测（M530-B）
 *
 * 测试 buildAllergyHistoryNlp 构建提取、extractAllergyHistoryStruct 过敏史结构化提取、buildAllergyHistoryNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAllergyHistoryNlp,
  buildAllergyHistoryNlpReport,
  extractAllergyHistoryStruct,
  type AllergyHistoryNlpInputV14,
} from "../../src/bff/aggregators/emrAllergyHistoryNlpV14Aggregator";
import { emrAllergyHistoryNlpV14Routes } from "../../src/bff/routes/emrAllergyHistoryNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAllergyHistoryNlp 构建提取", () => {
  // 手算：recordId='REC071', dept='呼吸科' → 正确构建
  it("recordId='REC071', dept='呼吸科' → 正确构建", () => {
    const nlp = buildAllergyHistoryNlp("REC071", "呼吸科");
    expect(nlp.recordId).toBe("REC071");
    expect(nlp.dept).toBe("呼吸科");
  });
});

describe("extractAllergyHistoryStruct 青霉素过敏", () => {
  // 手算：{rawText='青霉素,头孢,花粉'}
  // 手算：split(',') = ['青霉素','头孢','花粉'] → allergyList=3项
  // 手算：allergyCount = 3
  // 手算：hasPenicillin = '青霉素'.includes('青霉素') = true
  it("{rawText='青霉素,头孢,花粉'} → allergyList 3项, allergyCount=3, hasPenicillin=true", () => {
    const input: AllergyHistoryNlpInputV14 = { rawText: "青霉素,头孢,花粉" };
    const result = extractAllergyHistoryStruct(input);
    expect(result.allergyList).toEqual(["青霉素", "头孢", "花粉"]);
    expect(result.allergyCount).toBe(3);
    expect(result.hasPenicillin).toBe(true);
  });
});

describe("extractAllergyHistoryStruct 无青霉素", () => {
  // 手算：{rawText='花粉,尘螨'}
  // 手算：split(',') = ['花粉','尘螨'] → allergyList=2项
  // 手算：allergyCount = 2
  // 手算：hasPenicillin = '花粉'/'尘螨'都不含'青霉素' → false
  it("{rawText='花粉,尘螨'} → allergyList 2项, allergyCount=2, hasPenicillin=false", () => {
    const input: AllergyHistoryNlpInputV14 = { rawText: "花粉,尘螨" };
    const result = extractAllergyHistoryStruct(input);
    expect(result.allergyList).toEqual(["花粉", "尘螨"]);
    expect(result.allergyCount).toBe(2);
    expect(result.hasPenicillin).toBe(false);
  });
});

describe("buildAllergyHistoryNlpReport 构建报告", () => {
  // 手算：{allergyCount:3, hasPenicillin:true}
  // 手算：透传 allergyCount + hasPenicillin
  it("{allergyCount:3, hasPenicillin:true} → 正确返回（透传）", () => {
    const report = buildAllergyHistoryNlpReport({ allergyList: [], allergyCount: 3, hasPenicillin: true });
    expect(report.allergyCount).toBe(3);
    expect(report.hasPenicillin).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-allergy-history-nlp auth:true", () => {
    const def = (emrAllergyHistoryNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-allergy-history-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
