/**
 * 健澜科技 jlmedaios - 病历合理用药审查 V14 单测（M537-A）
 *
 * 测试 buildMedicationReview 构建用药审查、checkMedication 合理用药审查、buildMedicationReviewReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMedicationReview,
  buildMedicationReviewReport,
  checkMedication,
  type MedicationReviewInputV14,
} from "../../src/bff/aggregators/emrMedicationReviewV14Aggregator";
import { emrMedicationReviewV14Routes } from "../../src/bff/routes/emrMedicationReviewV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMedicationReview 构建用药审查", () => {
  // 手算：recordId='REC400', dept='心内科' → 正确构建
  it("recordId='REC400', dept='心内科' → 正确构建", () => {
    const review = buildMedicationReview("REC400", "心内科");
    expect(review.recordId).toBe("REC400");
    expect(review.dept).toBe("心内科");
  });
});

describe("checkMedication 安全", () => {
  // 手算：{drugName='阿司匹林', dosage=50, hasAllergy=false}
  // 手算：hasAllergy=false → 不触发过敏警告
  // 手算：dosage=50 → 50>100=false → 不触发剂量警告
  // 手算：warnings=[], safe=true
  it("{drugName='阿司匹林', dosage=50, hasAllergy=false} → safe=true, warnings=[]", () => {
    const input: MedicationReviewInputV14 = { drugName: "阿司匹林", dosage: 50, hasAllergy: false };
    const result = checkMedication(input);
    expect(result.safe).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});

describe("checkMedication 有警告", () => {
  // 手算：{drugName='青霉素', dosage=150, hasAllergy=true}
  // 手算：hasAllergy=true → 触发'存在过敏史，需警惕'
  // 手算：dosage=150 → 150>100=true → 触发'剂量超出常规上限'
  // 手算：warnings=['存在过敏史，需警惕','剂量超出常规上限'], safe=false
  it("{drugName='青霉素', dosage=150, hasAllergy=true} → safe=false, warnings=['存在过敏史，需警惕','剂量超出常规上限']", () => {
    const input: MedicationReviewInputV14 = { drugName: "青霉素", dosage: 150, hasAllergy: true };
    const result = checkMedication(input);
    expect(result.safe).toBe(false);
    expect(result.warnings).toEqual(["存在过敏史，需警惕", "剂量超出常规上限"]);
  });
});

describe("buildMedicationReviewReport 构建报告", () => {
  // 手算：{safe=false, warnings=['存在过敏史，需警惕','剂量超出常规上限']}
  // 手算：透传 safe + warnings
  it("{safe=false, warnings=['存在过敏史，需警惕','剂量超出常规上限']} → 正确返回（透传）", () => {
    const report = buildMedicationReviewReport({ safe: false, warnings: ["存在过敏史，需警惕", "剂量超出常规上限"] });
    expect(report.safe).toBe(false);
    expect(report.warnings).toEqual(["存在过敏史，需警惕", "剂量超出常规上限"]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-medication-review auth:true", () => {
    const def = (emrMedicationReviewV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-medication-review");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
