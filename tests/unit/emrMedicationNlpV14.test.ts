/**
 * 健澜科技 jlmedaios - 病历用药自动提取 V14 单测（M529-D，M529 收官）
 *
 * 测试 buildMedicationNlp 构建提取、extractMedicationStruct 用药自动提取、buildMedicationNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMedicationNlp,
  buildMedicationNlpReport,
  extractMedicationStruct,
  type MedicationNlpInputV14,
} from "../../src/bff/aggregators/emrMedicationNlpV14Aggregator";
import { emrMedicationNlpV14Routes } from "../../src/bff/routes/emrMedicationNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMedicationNlp 构建提取", () => {
  // 手算：recordId='REC063', dept='心内科' → 正确构建
  it("recordId='REC063', dept='心内科' → 正确构建", () => {
    const nlp = buildMedicationNlp("REC063", "心内科");
    expect(nlp.recordId).toBe("REC063");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractMedicationStruct 多药含剂量", () => {
  // 手算：{rawText='阿司匹林100mg;美托洛尔25mg;阿托伐他汀20mg'}
  // 手算：split(';') = ['阿司匹林100mg','美托洛尔25mg','阿托伐他汀20mg'] → medList=3项
  // 手算：medCount = 3
  // 手算：hasDose = medList.some(m => m.includes('mg') || m.includes('ml')) = true（都含mg）
  it("{rawText='阿司匹林100mg;美托洛尔25mg;阿托伐他汀20mg'} → medList 3项, medCount=3, hasDose=true", () => {
    const input: MedicationNlpInputV14 = {
      rawText: "阿司匹林100mg;美托洛尔25mg;阿托伐他汀20mg",
    };
    const result = extractMedicationStruct(input);
    expect(result.medList).toEqual(["阿司匹林100mg", "美托洛尔25mg", "阿托伐他汀20mg"]);
    expect(result.medCount).toBe(3);
    expect(result.hasDose).toBe(true);
  });
});

describe("extractMedicationStruct 单药无剂量", () => {
  // 手算：{rawText='维生素C'}
  // 手算：split(';') = ['维生素C'] → medList=1项
  // 手算：medCount = 1
  // 手算：hasDose = '维生素C'.includes('mg') || '维生素C'.includes('ml') = false
  it("{rawText='维生素C'} → medList=['维生素C'], medCount=1, hasDose=false", () => {
    const input: MedicationNlpInputV14 = { rawText: "维生素C" };
    const result = extractMedicationStruct(input);
    expect(result.medList).toEqual(["维生素C"]);
    expect(result.medCount).toBe(1);
    expect(result.hasDose).toBe(false);
  });
});

describe("buildMedicationNlpReport 构建报告", () => {
  // 手算：{medCount:3, hasDose:true}
  // 手算：透传 medCount + hasDose
  it("{medCount:3, hasDose:true} → 正确返回（透传）", () => {
    const report = buildMedicationNlpReport({ medList: [], medCount: 3, hasDose: true });
    expect(report.medCount).toBe(3);
    expect(report.hasDose).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-medication-nlp auth:true", () => {
    const def = (emrMedicationNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-medication-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
