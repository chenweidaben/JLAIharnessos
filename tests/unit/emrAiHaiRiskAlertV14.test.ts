/**
 * 健澜科技 jlmedaios - 病历AI院内感染风险预警 V14 单测（M559-C）
 *
 * 测试 buildAiHaiRiskAlert 构建 AI 院内感染风险预警、alertHaiRiskByAi AI 院内感染风险预警、buildAiHaiRiskAlertReport 构建院内感染风险预警报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiHaiRiskAlert,
  buildAiHaiRiskAlertReport,
  alertHaiRiskByAi,
  type AiHaiRiskAlertInputV14,
} from "../../src/bff/aggregators/emrAiHaiRiskAlertV14Aggregator";
import { emrAiHaiRiskAlertV14Routes } from "../../src/bff/routes/emrAiHaiRiskAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiHaiRiskAlert 构建 AI 院内感染风险预警", () => {
  // 手算：recordId='RECB060', dept='外科' → 正确构建
  it("recordId='RECB060', dept='外科' → 正确构建", () => {
    const base = buildAiHaiRiskAlert("RECB060", "外科");
    expect(base.recordId).toBe("RECB060");
    expect(base.dept).toBe("外科");
  });
});

describe("alertHaiRiskByAi 高风险", () => {
  // 手算：{hasSurgery=true, hasCatheter=true, hasImmunosuppressant=true, hospitalDays=10}
  // 手算：riskScore = 25+20+15+(10>=7?10:0) = 25+20+15+10 = 70
  // 手算：riskLevel = 70>=50 = '高风险'
  it("{hasSurgery=true, hasCatheter=true, hasImmunosuppressant=true, hospitalDays=10} → riskScore=70, riskLevel='高风险'", () => {
    const input: AiHaiRiskAlertInputV14 = { hasSurgery: true, hasCatheter: true, hasImmunosuppressant: true, hospitalDays: 10 };
    const result = alertHaiRiskByAi(input);
    expect(result.riskScore).toBe(70);
    expect(result.riskLevel).toBe("高风险");
  });
});

describe("alertHaiRiskByAi 低风险", () => {
  // 手算：{hasSurgery=false, hasCatheter=false, hasImmunosuppressant=false, hospitalDays=3}
  // 手算：riskScore = 0+0+0+(3>=7?0:0) = 0
  // 手算：riskLevel = 0>=25?... : '低风险' = '低风险'
  it("{hasSurgery=false, hasCatheter=false, hasImmunosuppressant=false, hospitalDays=3} → riskScore=0, riskLevel='低风险'", () => {
    const input: AiHaiRiskAlertInputV14 = { hasSurgery: false, hasCatheter: false, hasImmunosuppressant: false, hospitalDays: 3 };
    const result = alertHaiRiskByAi(input);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("低风险");
  });
});

describe("buildAiHaiRiskAlertReport 构建院内感染风险预警报告", () => {
  // 手算：{riskScore=70, riskLevel='高风险'}
  // 手算：透传 riskScore + riskLevel
  it("{riskScore=70, riskLevel='高风险'} → 正确返回（透传）", () => {
    const report = buildAiHaiRiskAlertReport({ riskScore: 70, riskLevel: "高风险" });
    expect(report.riskScore).toBe(70);
    expect(report.riskLevel).toBe("高风险");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-hai-risk-alert auth:true", () => {
    const def = (emrAiHaiRiskAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-hai-risk-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
