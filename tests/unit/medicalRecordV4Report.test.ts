/**
 * 健澜科技 jlmedaios - 病案 V4 纯函数单测（M252-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCodingAccuracyV4,
  buildMedicalRecordV4Report,
  calculateRecordGradeV4,
} from "../../src/bff/aggregators/medicalRecordV4ReportAggregator";

describe("assessCodingAccuracyV4", () => {
  it("编码5000审核4800 → 96%达标", () => {
    expect(assessCodingAccuracyV4(5000, 4800).adequate).toBe(true);
  });
});

describe("calculateRecordGradeV4", () => {
  it("病案5000缺陷50 → 甲级", () => {
    expect(calculateRecordGradeV4(5000, 50).grade).toBe("甲级");
  });
});

describe("buildMedicalRecordV4Report", () => {
  it("生成回收数据", () => {
    const r = buildMedicalRecordV4Report("30d");
    expect(r.retrieval.discharge).toBeGreaterThan(0);
  });

  it("生成编码数据", () => {
    const r = buildMedicalRecordV4Report("30d");
    expect(r.coding.icd10).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMedicalRecordV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
