/**
 * 健澜科技 jlmedaios - 病历AI门诊预检分诊 V14 单测（M560-B）
 *
 * 测试 buildAiOutpatientPreTriage 构建 AI 门诊预检分诊、preTriageOutpatientByAi AI 门诊预检分诊、buildAiOutpatientPreTriageReport 构建门诊预检分诊报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOutpatientPreTriage,
  buildAiOutpatientPreTriageReport,
  preTriageOutpatientByAi,
  type AiOutpatientPreTriageInputV14,
} from "../../src/bff/aggregators/emrAiOutpatientPreTriageV14Aggregator";
import { emrAiOutpatientPreTriageV14Routes } from "../../src/bff/routes/emrAiOutpatientPreTriageV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOutpatientPreTriage 构建 AI 门诊预检分诊", () => {
  // 手算：recordId='RECB063', dept='门诊部' → 正确构建
  it("recordId='RECB063', dept='门诊部' → 正确构建", () => {
    const base = buildAiOutpatientPreTriage("RECB063", "门诊部");
    expect(base.recordId).toBe("RECB063");
    expect(base.dept).toBe("门诊部");
  });
});

describe("preTriageOutpatientByAi 发热咳嗽", () => {
  // 手算：{symptom='咳嗽伴咳痰', fever=true}
  // 手算：department = '咳嗽伴咳痰'.includes('咳嗽')=true → '呼吸内科'
  // 手算：priority = fever=true → '优先就诊'
  it("{symptom='咳嗽伴咳痰', fever=true} → department='呼吸内科', priority='优先就诊'", () => {
    const input: AiOutpatientPreTriageInputV14 = { symptom: "咳嗽伴咳痰", fever: true };
    const result = preTriageOutpatientByAi(input);
    expect(result.department).toBe("呼吸内科");
    expect(result.priority).toBe("优先就诊");
  });
});

describe("preTriageOutpatientByAi 普通", () => {
  // 手算：{symptom='轻微头痛', fever=false}
  // 手算：department = '轻微头痛'.includes('咳嗽')=false, includes('腹痛')=false → '全科门诊'
  // 手算：priority = fever=false → '普通就诊'
  it("{symptom='轻微头痛', fever=false} → department='全科门诊', priority='普通就诊'", () => {
    const input: AiOutpatientPreTriageInputV14 = { symptom: "轻微头痛", fever: false };
    const result = preTriageOutpatientByAi(input);
    expect(result.department).toBe("全科门诊");
    expect(result.priority).toBe("普通就诊");
  });
});

describe("buildAiOutpatientPreTriageReport 构建门诊预检分诊报告", () => {
  // 手算：{department='呼吸内科', priority='优先就诊'}
  // 手算：透传 department + priority
  it("{department='呼吸内科', priority='优先就诊'} → 正确返回（透传）", () => {
    const report = buildAiOutpatientPreTriageReport({ department: "呼吸内科", priority: "优先就诊" });
    expect(report.department).toBe("呼吸内科");
    expect(report.priority).toBe("优先就诊");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-outpatient-pre-triage auth:true", () => {
    const def = (emrAiOutpatientPreTriageV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-outpatient-pre-triage");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
