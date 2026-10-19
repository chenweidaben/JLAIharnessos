/**
 * 健澜科技 jlmedaios - 病历AI用药错误预警 V14 单测（M559-B）
 *
 * 测试 buildAiMedicationErrorAlert 构建 AI 用药错误预警、alertMedicationErrorByAi AI 用药错误预警、buildAiMedicationErrorAlertReport 构建用药错误预警报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiMedicationErrorAlert,
  buildAiMedicationErrorAlertReport,
  alertMedicationErrorByAi,
  type AiMedicationErrorAlertInputV14,
} from "../../src/bff/aggregators/emrAiMedicationErrorAlertV14Aggregator";
import { emrAiMedicationErrorAlertV14Routes } from "../../src/bff/routes/emrAiMedicationErrorAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiMedicationErrorAlert 构建 AI 用药错误预警", () => {
  // 手算：recordId='RECB059', dept='药剂科' → 正确构建
  it("recordId='RECB059', dept='药剂科' → 正确构建", () => {
    const base = buildAiMedicationErrorAlert("RECB059", "药剂科");
    expect(base.recordId).toBe("RECB059");
    expect(base.dept).toBe("药剂科");
  });
});

describe("alertMedicationErrorByAi 无预警", () => {
  // 手算：{drugName='布洛芬', patientAge=45, hasAllergy=false}
  // 手算：isError = false || (45>=75 && ...) = false || false = false
  // 手算：alertLevel = hasAllergy=false, 45>=75=false → '无预警'
  it("{drugName='布洛芬', patientAge=45, hasAllergy=false} → isError=false, alertLevel='无预警'", () => {
    const input: AiMedicationErrorAlertInputV14 = { drugName: "布洛芬", patientAge: 45, hasAllergy: false };
    const result = alertMedicationErrorByAi(input);
    expect(result.isError).toBe(false);
    expect(result.alertLevel).toBe("无预警");
  });
});

describe("alertMedicationErrorByAi 红色", () => {
  // 手算：{drugName='青霉素', patientAge=50, hasAllergy=true}
  // 手算：isError = true || ... = true
  // 手算：alertLevel = hasAllergy=true → '红色预警'
  it("{drugName='青霉素', patientAge=50, hasAllergy=true} → isError=true, alertLevel='红色预警'", () => {
    const input: AiMedicationErrorAlertInputV14 = { drugName: "青霉素", patientAge: 50, hasAllergy: true };
    const result = alertMedicationErrorByAi(input);
    expect(result.isError).toBe(true);
    expect(result.alertLevel).toBe("红色预警");
  });
});

describe("buildAiMedicationErrorAlertReport 构建用药错误预警报告", () => {
  // 手算：{isError=false, alertLevel='无预警'}
  // 手算：透传 isError + alertLevel
  it("{isError=false, alertLevel='无预警'} → 正确返回（透传）", () => {
    const report = buildAiMedicationErrorAlertReport({ isError: false, alertLevel: "无预警" });
    expect(report.isError).toBe(false);
    expect(report.alertLevel).toBe("无预警");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-medication-error-alert auth:true", () => {
    const def = (emrAiMedicationErrorAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-medication-error-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
