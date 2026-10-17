/**
 * 健澜科技 jlmedaios - 电子病历五级评级自评 V13 单测（M323-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmrDomainScoreV13,
  computeEmrOverallScoreV13,
  gradeEmrLevelV13,
  type EmrAssessmentV13,
} from "../../src/bff/aggregators/emr5LevelV13Aggregator";
import { emr5LevelV13Routes } from "../../src/bff/routes/emr5LevelV13";

const assessments: EmrAssessmentV13[] = [
  { domain: "dataManagement", score: 85 },
  { domain: "medicalQuality", score: 88 },
  { domain: "operationManagement", score: 82 },
  { domain: "dataUtilization", score: 86 },
  { domain: "patientService", score: 84 },
  { domain: "teachingResearch", score: 83 },
  { domain: "managementDecision", score: 87 },
  { domain: "security", score: 89 },
];

describe("computeEmrDomainScoreV13", () => {
  it("返回 8 域得分", () => {
    const domainScores = computeEmrDomainScoreV13(assessments);
    expect(domainScores.dataManagement).toBe(85);
    expect(domainScores.security).toBe(89);
  });
  it("空态 → 全 0", () => {
    expect(computeEmrDomainScoreV13([]).dataManagement).toBe(0);
  });
});

describe("computeEmrOverallScoreV13", () => {
  // 算式：(85+88+82+86+84+83+87+89)/8 = 684/8 = 85.5 → round = 86
  it("overallScore = 86", () => {
    const domainScores = computeEmrDomainScoreV13(assessments);
    expect(computeEmrOverallScoreV13(domainScores)).toBe(86);
  });
});

describe("gradeEmrLevelV13", () => {
  // 算式：≥90 = 五级
  it("90 → 五级", () => {
    expect(gradeEmrLevelV13(90)).toBe("五级");
  });
  // 算式：80-89 = 四级
  it("86 → 四级", () => {
    expect(gradeEmrLevelV13(86)).toBe("四级");
  });
  // 算式：70-79 = 三级
  it("75 → 三级", () => {
    expect(gradeEmrLevelV13(75)).toBe("三级");
  });
  // 算式：<70 = 未达标
  it("65 → 未达标", () => {
    expect(gradeEmrLevelV13(65)).toBe("未达标");
  });
});

describe("emr5LevelV13Routes 读路由", () => {
  it("GET /api/v1/emr5-level 路由存在且 auth:true", () => {
    const route = emr5LevelV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emr5-level",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
