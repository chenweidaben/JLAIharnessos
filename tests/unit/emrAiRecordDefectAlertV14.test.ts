/**
 * 健澜科技 jlmedaios - 病历AI病案缺陷预警 V14 单测（M556-C）
 *
 * 测试 buildAiRecordDefectAlert 构建 AI 病案缺陷预警、alertRecordDefectByAi AI 病案缺陷预警、buildAiRecordDefectAlertReport 构建病案缺陷预警报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRecordDefectAlert,
  buildAiRecordDefectAlertReport,
  alertRecordDefectByAi,
  type AiRecordDefectAlertInputV14,
} from "../../src/bff/aggregators/emrAiRecordDefectAlertV14Aggregator";
import { emrAiRecordDefectAlertV14Routes } from "../../src/bff/routes/emrAiRecordDefectAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRecordDefectAlert 构建 AI 病案缺陷预警", () => {
  // 手算：recordId='RECB047', dept='病案室' → 正确构建
  it("recordId='RECB047', dept='病案室' → 正确构建", () => {
    const base = buildAiRecordDefectAlert("RECB047", "病案室");
    expect(base.recordId).toBe("RECB047");
    expect(base.dept).toBe("病案室");
  });
});

describe("alertRecordDefectByAi 正常", () => {
  // 手算：{hasMissingDiagnosis=false, hasMissingSurgeon=false, hasMissingOpDate=false, hasMissingDischargeReason=false}
  // 手算：4 项全 false（全不缺）→ defectCount = 0+0+0+0 = 0
  // 手算：alertLevel = 0 >= 1 ? ... : '正常' = '正常'
  it("{4项全不缺} → defectCount=0, alertLevel='正常'", () => {
    const input: AiRecordDefectAlertInputV14 = {
      hasMissingDiagnosis: false,
      hasMissingSurgeon: false,
      hasMissingOpDate: false,
      hasMissingDischargeReason: false,
    };
    const result = alertRecordDefectByAi(input);
    expect(result.defectCount).toBe(0);
    expect(result.alertLevel).toBe("正常");
  });
});

describe("alertRecordDefectByAi 红色", () => {
  // 手算：{hasMissingDiagnosis=true, hasMissingSurgeon=true, hasMissingOpDate=true, hasMissingDischargeReason=false}
  // 手算：defectCount = 1+1+1+0 = 3（缺诊断+术者+手术日期）
  // 手算：alertLevel = 3 >= 3 ? '红色预警' = '红色预警'
  it("{hasMissingDiagnosis=true, hasMissingSurgeon=true, hasMissingOpDate=true, hasMissingDischargeReason=false} → defectCount=3, alertLevel='红色预警'", () => {
    const input: AiRecordDefectAlertInputV14 = {
      hasMissingDiagnosis: true,
      hasMissingSurgeon: true,
      hasMissingOpDate: true,
      hasMissingDischargeReason: false,
    };
    const result = alertRecordDefectByAi(input);
    expect(result.defectCount).toBe(3);
    expect(result.alertLevel).toBe("红色预警");
  });
});

describe("buildAiRecordDefectAlertReport 构建病案缺陷预警报告", () => {
  // 手算：{alertLevel='正常', defectCount=0}
  // 手算：透传 alertLevel + defectCount
  it("{alertLevel='正常', defectCount=0} → 正确返回（透传）", () => {
    const report = buildAiRecordDefectAlertReport({ alertLevel: "正常", defectCount: 0 });
    expect(report.alertLevel).toBe("正常");
    expect(report.defectCount).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-record-defect-alert auth:true", () => {
    const def = (emrAiRecordDefectAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-record-defect-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
