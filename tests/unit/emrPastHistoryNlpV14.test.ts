/**
 * 健澜科技 jlmedaios - 病历既往史 NLP 提取 V14 单测（M530-A）
 *
 * 测试 buildPastHistoryNlp 构建提取、extractPastHistoryStruct 既往史结构化提取、buildPastHistoryNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPastHistoryNlp,
  buildPastHistoryNlpReport,
  extractPastHistoryStruct,
  type PastHistoryNlpInputV14,
} from "../../src/bff/aggregators/emrPastHistoryNlpV14Aggregator";
import { emrPastHistoryNlpV14Routes } from "../../src/bff/routes/emrPastHistoryNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPastHistoryNlp 构建提取", () => {
  // 手算：recordId='REC070', dept='心内科' → 正确构建
  it("recordId='REC070', dept='心内科' → 正确构建", () => {
    const nlp = buildPastHistoryNlp("REC070", "心内科");
    expect(nlp.recordId).toBe("REC070");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractPastHistoryStruct 多病含手术", () => {
  // 手算：{rawText='高血压；糖尿病；阑尾手术史'}
  // 手算：split('；') = ['高血压','糖尿病','阑尾手术史'] → diseaseList=3项
  // 手算：diseaseCount = String(3) = '3'
  // 手算：hasSurgery = '阑尾手术史'.includes('手术') = true
  it("{rawText='高血压；糖尿病；阑尾手术史'} → diseaseList 3项, diseaseCount='3', hasSurgery=true", () => {
    const input: PastHistoryNlpInputV14 = { rawText: "高血压；糖尿病；阑尾手术史" };
    const result = extractPastHistoryStruct(input);
    expect(result.diseaseList).toEqual(["高血压", "糖尿病", "阑尾手术史"]);
    expect(result.diseaseCount).toBe("3");
    expect(result.hasSurgery).toBe(true);
  });
});

describe("extractPastHistoryStruct 无手术", () => {
  // 手算：{rawText='高血压；糖尿病'}
  // 手算：split('；') = ['高血压','糖尿病'] → diseaseList=2项
  // 手算：diseaseCount = String(2) = '2'
  // 手算：hasSurgery = '高血压'/'糖尿病'都不含'手术' → false
  it("{rawText='高血压；糖尿病'} → diseaseList 2项, diseaseCount='2', hasSurgery=false", () => {
    const input: PastHistoryNlpInputV14 = { rawText: "高血压；糖尿病" };
    const result = extractPastHistoryStruct(input);
    expect(result.diseaseList).toEqual(["高血压", "糖尿病"]);
    expect(result.diseaseCount).toBe("2");
    expect(result.hasSurgery).toBe(false);
  });
});

describe("buildPastHistoryNlpReport 构建报告", () => {
  // 手算：{diseaseCount:'3', hasSurgery:true}
  // 手算：透传 diseaseCount + hasSurgery
  it("{diseaseCount:'3', hasSurgery:true} → 正确返回（透传）", () => {
    const report = buildPastHistoryNlpReport({ diseaseList: [], diseaseCount: "3", hasSurgery: true });
    expect(report.diseaseCount).toBe("3");
    expect(report.hasSurgery).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-past-history-nlp auth:true", () => {
    const def = (emrPastHistoryNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-past-history-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
