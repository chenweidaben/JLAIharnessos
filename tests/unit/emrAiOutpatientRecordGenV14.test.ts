/**
 * 健澜科技 jlmedaios - 病历AI门诊病历智能生成 V14 单测（M558-A）
 *
 * 测试 buildAiOutpatientRecordGen 构建 AI 门诊病历智能生成、genOutpatientRecordByAi AI 门诊病历智能生成、buildAiOutpatientRecordGenReport 构建门诊病历智能生成报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOutpatientRecordGen,
  buildAiOutpatientRecordGenReport,
  genOutpatientRecordByAi,
  type AiOutpatientRecordGenInputV14,
} from "../../src/bff/aggregators/emrAiOutpatientRecordGenV14Aggregator";
import { emrAiOutpatientRecordGenV14Routes } from "../../src/bff/routes/emrAiOutpatientRecordGenV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOutpatientRecordGen 构建 AI 门诊病历智能生成", () => {
  // 手算：recordId='RECB053', dept='门诊办公室' → 正确构建
  it("recordId='RECB053', dept='门诊办公室' → 正确构建", () => {
    const base = buildAiOutpatientRecordGen("RECB053", "门诊办公室");
    expect(base.recordId).toBe("RECB053");
    expect(base.dept).toBe("门诊办公室");
  });
});

describe("genOutpatientRecordByAi 王五", () => {
  // 手算：{patientName='王五', symptom='咳嗽3天', diagnosis='急性支气管炎'}
  // 手算：record = `患者王五，主诉：咳嗽3天，诊断：急性支气管炎，建议门诊随访。`
  // 手算：doctor = 'AI门诊助手'
  it("{patientName='王五', symptom='咳嗽3天', diagnosis='急性支气管炎'} → record 含关键字段, doctor='AI门诊助手'", () => {
    const input: AiOutpatientRecordGenInputV14 = { patientName: "王五", symptom: "咳嗽3天", diagnosis: "急性支气管炎" };
    const result = genOutpatientRecordByAi(input);
    expect(result.record).toContain("王五");
    expect(result.record).toContain("咳嗽3天");
    expect(result.record).toContain("急性支气管炎");
    expect(result.doctor).toBe("AI门诊助手");
  });
});

describe("genOutpatientRecordByAi 赵六", () => {
  // 手算：{patientName='赵六', symptom='头痛1周', diagnosis='紧张性头痛'}
  // 手算：record = `患者赵六，主诉：头痛1周，诊断：紧张性头痛，建议门诊随访。`
  // 手算：doctor = 'AI门诊助手'
  it("{patientName='赵六', symptom='头痛1周', diagnosis='紧张性头痛'} → record 含关键字段, doctor='AI门诊助手'", () => {
    const input: AiOutpatientRecordGenInputV14 = { patientName: "赵六", symptom: "头痛1周", diagnosis: "紧张性头痛" };
    const result = genOutpatientRecordByAi(input);
    expect(result.record).toContain("赵六");
    expect(result.record).toContain("头痛1周");
    expect(result.doctor).toBe("AI门诊助手");
  });
});

describe("buildAiOutpatientRecordGenReport 构建门诊病历智能生成报告", () => {
  // 手算：{record='测试病历', doctor='AI门诊助手'}
  // 手算：透传 record + doctor
  it("{record='测试病历', doctor='AI门诊助手'} → 正确返回（透传）", () => {
    const report = buildAiOutpatientRecordGenReport({ record: "测试病历", doctor: "AI门诊助手" });
    expect(report.record).toBe("测试病历");
    expect(report.doctor).toBe("AI门诊助手");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-outpatient-record-gen auth:true", () => {
    const def = (emrAiOutpatientRecordGenV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-outpatient-record-gen");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
