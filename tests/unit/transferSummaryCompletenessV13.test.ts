/**
 * 健澜科技 jlmedaios - 转科交接单完整度评分 V13 单测（M315-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTransferCompletenessScoreV13,
  gradeTransferSummaryV13,
  identifyMissingTransferFieldsV13,
  type TransferSummaryV13,
} from "../../src/bff/aggregators/transferSummaryCompletenessV13Aggregator";
import { transferSummaryCompletenessV13Routes } from "../../src/bff/routes/transferSummaryCompletenessV13";

const summary: TransferSummaryV13 = {
  patientId: "p1",
  diagnosis: "急性心肌梗死",
  medications: "阿司匹林 100mg qd",
  nursingNotes: "心电监护",
  allergyHistory: "无",
  riskAssessment: "",
};

describe("computeTransferCompletenessScoreV13", () => {
  // 算式：5 必填项（diagnosis/medications/nursingNotes/allergyHistory/riskAssessment）
  // 已填 4（diagnosis/medications/nursingNotes/allergyHistory），缺失 1（riskAssessment）
  // score = 4/5×100 = 80
  it("score = 80", () => {
    expect(computeTransferCompletenessScoreV13(summary)).toBe(80);
  });
  it("空态 → 0", () => {
    const empty: TransferSummaryV13 = {
      patientId: "p2",
      diagnosis: "",
      medications: "",
      nursingNotes: "",
      allergyHistory: "",
      riskAssessment: "",
    };
    expect(computeTransferCompletenessScoreV13(empty)).toBe(0);
  });
});

describe("identifyMissingTransferFieldsV13", () => {
  // 算式：riskAssessment="" → 缺失 = ["风险评估"]
  it("缺失 = [风险评估]", () => {
    expect(identifyMissingTransferFieldsV13(summary)).toEqual(["风险评估"]);
  });
});

describe("gradeTransferSummaryV13", () => {
  // 算式：80 在 70-90 → 部分完整
  it("80 → 部分完整", () => {
    expect(gradeTransferSummaryV13(80)).toBe("部分完整");
  });
  // 算式：95 ≥ 90 → 完整
  it("95 → 完整", () => {
    expect(gradeTransferSummaryV13(95)).toBe("完整");
  });
  // 算式：60 < 70 → 不完整
  it("60 → 不完整", () => {
    expect(gradeTransferSummaryV13(60)).toBe("不完整");
  });
});

describe("transferSummaryCompletenessV13Routes 读路由", () => {
  it("GET /api/v1/transfer-summary-completeness 路由存在且 auth:true", () => {
    const route = transferSummaryCompletenessV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/transfer-summary-completeness",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
