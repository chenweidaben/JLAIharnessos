/**
 * 健澜科技 jlmedaios - 病历诊断自动提取 V14 单测（M529-C）
 *
 * 测试 buildDiagnosisNlp 构建提取、extractDiagnosisStruct 诊断自动提取、buildDiagnosisNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDiagnosisNlp,
  buildDiagnosisNlpReport,
  extractDiagnosisStruct,
  type DiagnosisNlpInputV14,
} from "../../src/bff/aggregators/emrDiagnosisNlpV14Aggregator";
import { emrDiagnosisNlpV14Routes } from "../../src/bff/routes/emrDiagnosisNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDiagnosisNlp 构建提取", () => {
  // 手算：recordId='REC062', dept='心内科' → 正确构建
  it("recordId='REC062', dept='心内科' → 正确构建", () => {
    const nlp = buildDiagnosisNlp("REC062", "心内科");
    expect(nlp.recordId).toBe("REC062");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractDiagnosisStruct 多诊断", () => {
  // 手算：{rawText='冠心病,高血压,2型糖尿病'}
  // 手算：split(',') = ['冠心病','高血压','2型糖尿病'] → diagnosisList=3项
  // 手算：diagnosisCount = diagnosisList.length = 3
  it("{rawText='冠心病,高血压,2型糖尿病'} → diagnosisList=['冠心病','高血压','2型糖尿病'], diagnosisCount=3", () => {
    const input: DiagnosisNlpInputV14 = { rawText: "冠心病,高血压,2型糖尿病" };
    const result = extractDiagnosisStruct(input);
    expect(result.diagnosisList).toEqual(["冠心病", "高血压", "2型糖尿病"]);
    expect(result.diagnosisCount).toBe(3);
  });
});

describe("extractDiagnosisStruct 单诊断", () => {
  // 手算：{rawText='急性阑尾炎'}
  // 手算：split(',') = ['急性阑尾炎'] → diagnosisList=1项
  // 手算：diagnosisCount = 1
  it("{rawText='急性阑尾炎'} → diagnosisList=['急性阑尾炎'], diagnosisCount=1", () => {
    const input: DiagnosisNlpInputV14 = { rawText: "急性阑尾炎" };
    const result = extractDiagnosisStruct(input);
    expect(result.diagnosisList).toEqual(["急性阑尾炎"]);
    expect(result.diagnosisCount).toBe(1);
  });
});

describe("buildDiagnosisNlpReport 构建报告", () => {
  // 手算：{diagnosisCount:3, topDiagnosis:'冠心病'}
  // 手算：透传 diagnosisCount + topDiagnosis
  it("{diagnosisCount:3, topDiagnosis:'冠心病'} → 正确返回（透传）", () => {
    const report = buildDiagnosisNlpReport({ diagnosisCount: 3, topDiagnosis: "冠心病" });
    expect(report.diagnosisCount).toBe(3);
    expect(report.topDiagnosis).toBe("冠心病");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-diagnosis-nlp auth:true", () => {
    const def = (emrDiagnosisNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-diagnosis-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
