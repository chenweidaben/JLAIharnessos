/**
 * 健澜科技 jlmedaios - NLP 病历去重 V14 单测（M491-C）
 *
 * 测试 deduplicateMedicalRecords 去重、buildDedupReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  deduplicateMedicalRecords,
  buildDedupReport,
  type NlpDedupResultV14,
  type MedicalRecordV14,
} from "../../src/bff/aggregators/emrNlpDeduplicationV14Aggregator";
import { emrNlpDeduplicationV14Routes } from "../../src/bff/routes/emrNlpDeduplicationV14";
import type { RouteDef } from "../../src/bff/types";

describe("deduplicateMedicalRecords 有重复", () => {
  // 手算：[{id:'1',content:'感冒'},{id:'2',content:'感冒'},{id:'3',content:'发烧'}] → uniqueRecords 长度=2
  it("3 条记录（感冒/感冒/发烧）→ uniqueRecords 长度=2", () => {
    const records: MedicalRecordV14[] = [
      { id: "1", content: "感冒" },
      { id: "2", content: "感冒" },
      { id: "3", content: "发烧" },
    ];
    const result = deduplicateMedicalRecords(records);
    expect(result.uniqueRecords.length).toBe(2);
  });
});

describe("deduplicateMedicalRecords 无重复", () => {
  // 手算：无重复 → uniqueRecords 长度=原数
  it("3 条记录（感冒/发烧/咳嗽）→ uniqueRecords 长度=3", () => {
    const records: MedicalRecordV14[] = [
      { id: "1", content: "感冒" },
      { id: "2", content: "发烧" },
      { id: "3", content: "咳嗽" },
    ];
    const result = deduplicateMedicalRecords(records);
    expect(result.uniqueRecords.length).toBe(3);
  });
});

describe("buildDedupReport 3→2", () => {
  // 手算：totalCount=3, uniqueCount=2, duplicateCount=1（3-2=1）
  it("totalCount=3, uniqueCount=2 → duplicateCount=1", () => {
    const result: NlpDedupResultV14 = {
      uniqueRecords: [
        { id: "1", content: "感冒" },
        { id: "3", content: "发烧" },
      ],
    };
    const report = buildDedupReport(result, 3);
    expect(report.totalCount).toBe(3);
    expect(report.uniqueCount).toBe(2);
    expect(report.duplicateCount).toBe(1);
  });
});

describe("buildDedupReport 空数组", () => {
  // 手算：totalCount=0 → totalCount=0
  it("空数组 → totalCount=0", () => {
    const result: NlpDedupResultV14 = { uniqueRecords: [] };
    const report = buildDedupReport(result, 0);
    expect(report.totalCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-deduplication auth:true", () => {
    const def = (emrNlpDeduplicationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-deduplication");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
