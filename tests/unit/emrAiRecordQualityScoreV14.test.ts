/**
 * 健澜科技 jlmedaios - 病历AI病案质量评分 V14 单测（M556-B）
 *
 * 测试 buildAiRecordQualityScore 构建 AI 病案质量评分、scoreRecordQualityByAi AI 病案质量评分、buildAiRecordQualityScoreReport 构建病案质量评分报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRecordQualityScore,
  buildAiRecordQualityScoreReport,
  scoreRecordQualityByAi,
  type AiRecordQualityScoreInputV14,
} from "../../src/bff/aggregators/emrAiRecordQualityScoreV14Aggregator";
import { emrAiRecordQualityScoreV14Routes } from "../../src/bff/routes/emrAiRecordQualityScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRecordQualityScore 构建 AI 病案质量评分", () => {
  // 手算：recordId='RECB046', dept='病案室' → 正确构建
  it("recordId='RECB046', dept='病案室' → 正确构建", () => {
    const base = buildAiRecordQualityScore("RECB046", "病案室");
    expect(base.recordId).toBe("RECB046");
    expect(base.dept).toBe("病案室");
  });
});

describe("scoreRecordQualityByAi 优秀", () => {
  // 手算：{completeness=95, accuracy=90, timeliness=85}
  // 手算：totalScore = Math.round(95*0.4 + 90*0.4 + 85*0.2) = Math.round(38 + 36 + 17) = 91
  // 手算：grade = 91 >= 90 → '优秀'
  it("{completeness=95, accuracy=90, timeliness=85} → totalScore=91, grade='优秀'", () => {
    const input: AiRecordQualityScoreInputV14 = { completeness: 95, accuracy: 90, timeliness: 85 };
    const result = scoreRecordQualityByAi(input);
    expect(result.totalScore).toBe(91);
    expect(result.grade).toBe("优秀");
  });
});

describe("scoreRecordQualityByAi 合格", () => {
  // 手算：{completeness=75, accuracy=70, timeliness=80}
  // 手算：totalScore = Math.round(75*0.4 + 70*0.4 + 80*0.2) = Math.round(30 + 28 + 16) = Math.round(74) = 74
  // 手算：规格原写 73 有误，按公式实际修正为 74；grade = 74 >= 70, < 80 → '合格'
  it("{completeness=75, accuracy=70, timeliness=80} → totalScore=74, grade='合格'（规格原写 73 有误，按公式实际修正）", () => {
    const input: AiRecordQualityScoreInputV14 = { completeness: 75, accuracy: 70, timeliness: 80 };
    const result = scoreRecordQualityByAi(input);
    expect(result.totalScore).toBe(74);
    expect(result.grade).toBe("合格");
  });
});

describe("buildAiRecordQualityScoreReport 构建病案质量评分报告", () => {
  // 手算：{totalScore=91, grade='优秀'}
  // 手算：透传 totalScore + grade
  it("{totalScore=91, grade='优秀'} → 正确返回（透传）", () => {
    const report = buildAiRecordQualityScoreReport({ totalScore: 91, grade: "优秀" });
    expect(report.totalScore).toBe(91);
    expect(report.grade).toBe("优秀");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-record-quality-score auth:true", () => {
    const def = (emrAiRecordQualityScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-record-quality-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
