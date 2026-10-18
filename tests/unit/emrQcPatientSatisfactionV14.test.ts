/**
 * 健澜科技 jlmedaios - 质控患者满意度调查 V14 单测（M504-D，M504 收官）
 *
 * 测试 buildSurvey 构建、submitSurvey 提交、aggregateSatisfaction 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateSatisfaction,
  buildSurvey,
  submitSurvey,
  type PatientSurveyV14,
} from "../../src/bff/aggregators/emrQcPatientSatisfactionV14Aggregator";
import { emrQcPatientSatisfactionV14Routes } from "../../src/bff/routes/emrQcPatientSatisfactionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSurvey 王患者", () => {
  // 手算：patient='王患者', score=95, comment='服务很好' → 正确构建
  it("patient='王患者', score=95, comment='服务很好' → 正确构建", () => {
    const survey: PatientSurveyV14 = buildSurvey("王患者", 95, "服务很好");
    expect(survey.patient).toBe("王患者");
    expect(survey.score).toBe(95);
    expect(survey.comment).toBe("服务很好");
  });
});

describe("submitSurvey 空列表提交", () => {
  // 手算：空列表+新调查 → 返回长度 1（0+1=1）
  it("空列表+新调查 → 返回长度 1", () => {
    const surveys: PatientSurveyV14[] = [];
    const survey = buildSurvey("王患者", 95, "服务很好");
    const result = submitSurvey(surveys, survey);
    expect(result.length).toBe(1);
  });
});

describe("aggregateSatisfaction 三份调查", () => {
  // 手算：3 份调查（95/88/92）
  // total = 3
  // avgScore = (95+88+92)/3 = 275/3 ≈ 91.7
  // satisfiedCount = 2（95和92 >=90，88 <90）
  // rate = Math.ceil(2/3*100) = Math.ceil(66.67) = 67
  it("3 份调查（95/88/92）→ total=3, avgScore=91.7, rate=67", () => {
    const surveys: PatientSurveyV14[] = [
      buildSurvey("王患者", 95, "服务很好"),
      buildSurvey("李患者", 88, "基本满意"),
      buildSurvey("张患者", 92, "医生很专业"),
    ];
    const result = aggregateSatisfaction(surveys);
    expect(result.total).toBe(3);
    expect(result.avgScore).toBeCloseTo(91.7);
    expect(result.rate).toBe(67);
  });
});

describe("aggregateSatisfaction 空数组", () => {
  // 手算：空数组 → total=0, avgScore=0, rate=0
  it("空数组 → total=0, avgScore=0, rate=0", () => {
    const surveys: PatientSurveyV14[] = [];
    const result = aggregateSatisfaction(surveys);
    expect(result.total).toBe(0);
    expect(result.avgScore).toBe(0);
    expect(result.rate).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-patient-satisfaction auth:true", () => {
    const def = (emrQcPatientSatisfactionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-patient-satisfaction");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
