/**
 * 健澜科技 jlmedaios - 病历AI检验危急值智能提醒 V14 单测（M561-D，M561 收官）
 *
 * 测试 buildAiLabCriticalAlert 构建 AI 检验危急值智能提醒、alertLabCriticalByAi AI 检验危急值智能提醒、buildAiLabCriticalAlertReport 构建检验危急值智能提醒报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiLabCriticalAlert,
  buildAiLabCriticalAlertReport,
  alertLabCriticalByAi,
  type AiLabCriticalAlertInputV14,
} from "../../src/bff/aggregators/emrAiLabCriticalAlertV14Aggregator";
import { emrAiLabCriticalAlertV14Routes } from "../../src/bff/routes/emrAiLabCriticalAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiLabCriticalAlert 构建 AI 检验危急值智能提醒", () => {
  // 手算：recordId='RECB069', dept='检验科' → 正确构建
  it("recordId='RECB069', dept='检验科' → 正确构建", () => {
    const base = buildAiLabCriticalAlert("RECB069", "检验科");
    expect(base.recordId).toBe("RECB069");
    expect(base.dept).toBe("检验科");
  });
});

describe("alertLabCriticalByAi 偏高危急", () => {
  // 手算：{testName='血钾', value=6.5, lowLimit=3.5, highLimit=5.5}
  // 手算：isCritical = 6.5<3.5=false || 6.5>5.5=true → true
  // 手算：alertLevel = value<lowLimit(6.5<3.5=false) → '偏高危急'
  // 手算：advice = '立即通知临床医生，建议复查'
  it("{testName='血钾', value=6.5, lowLimit=3.5, highLimit=5.5} → isCritical=true, alertLevel='偏高危急', advice='立即通知临床医生，建议复查'", () => {
    const input: AiLabCriticalAlertInputV14 = { testName: "血钾", value: 6.5, lowLimit: 3.5, highLimit: 5.5 };
    const result = alertLabCriticalByAi(input);
    expect(result.isCritical).toBe(true);
    expect(result.alertLevel).toBe("偏高危急");
    expect(result.advice).toBe("立即通知临床医生，建议复查");
  });
});

describe("alertLabCriticalByAi 正常", () => {
  // 手算：{testName='白细胞', value=6.0, lowLimit=4.0, highLimit=10.0}
  // 手算：isCritical = 6.0<4.0=false || 6.0>10.0=false → false（4.0<=6.0<=10.0）
  // 手算：alertLevel = isCritical=false → '正常'
  // 手算：advice = '无需特殊处理'
  it("{testName='白细胞', value=6.0, lowLimit=4.0, highLimit=10.0} → isCritical=false, alertLevel='正常', advice='无需特殊处理'", () => {
    const input: AiLabCriticalAlertInputV14 = { testName: "白细胞", value: 6.0, lowLimit: 4.0, highLimit: 10.0 };
    const result = alertLabCriticalByAi(input);
    expect(result.isCritical).toBe(false);
    expect(result.alertLevel).toBe("正常");
    expect(result.advice).toBe("无需特殊处理");
  });
});

describe("buildAiLabCriticalAlertReport 构建检验危急值智能提醒报告", () => {
  // 手算：{isCritical=true, alertLevel='偏高危急', advice='立即通知临床医生，建议复查'}
  // 手算：透传 isCritical + alertLevel + advice
  it("{isCritical=true, alertLevel='偏高危急', advice='立即通知临床医生，建议复查'} → 正确返回（透传）", () => {
    const report = buildAiLabCriticalAlertReport({ isCritical: true, alertLevel: "偏高危急", advice: "立即通知临床医生，建议复查" });
    expect(report.isCritical).toBe(true);
    expect(report.alertLevel).toBe("偏高危急");
    expect(report.advice).toBe("立即通知临床医生，建议复查");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-lab-critical-alert auth:true", () => {
    const def = (emrAiLabCriticalAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-lab-critical-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
