/**
 * 健澜科技 jlmedaios - 病历AI患者教育材料生成 V14 单测（M547-B）
 *
 * 测试 buildAiPatientEdu 构建 AI 患者教育材料、generatePatientEduByAi AI 患者教育材料生成、buildAiPatientEduReport 构建教育材料报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPatientEdu,
  buildAiPatientEduReport,
  generatePatientEduByAi,
  type AiPatientEduInputV14,
} from "../../src/bff/aggregators/emrAiPatientEduV14Aggregator";
import { emrAiPatientEduV14Routes } from "../../src/bff/routes/emrAiPatientEduV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPatientEdu 构建 AI 患者教育材料", () => {
  // 手算：recordId='RECB010', dept='心内科' → 正确构建
  it("recordId='RECB010', dept='心内科' → 正确构建", () => {
    const base = buildAiPatientEdu("RECB010", "心内科");
    expect(base.recordId).toBe("RECB010");
    expect(base.dept).toBe("心内科");
  });
});

describe("generatePatientEduByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗'}
  // 手算：diagnosis.includes('心梗') → true → title='心梗患者居家康复指南'
  // 手算：title.includes('心梗') → true → content='按时服药、定期复查、避免剧烈运动、保持情绪稳定'（4条）
  it("{diagnosis='急性心梗'} → title='心梗患者居家康复指南', content='按时服药、定期复查、避免剧烈运动、保持情绪稳定'", () => {
    const input: AiPatientEduInputV14 = { diagnosis: "急性心梗" };
    const result = generatePatientEduByAi(input);
    expect(result.title).toBe("心梗患者居家康复指南");
    expect(result.content).toBe("按时服药、定期复查、避免剧烈运动、保持情绪稳定");
  });
});

describe("generatePatientEduByAi 一般", () => {
  // 手算：{diagnosis='上感'}
  // 手算：diagnosis.includes('心梗') → false → title='常见病健康宣教'
  // 手算：title.includes('心梗') → false → content='遵医嘱用药、注意休息、均衡饮食'（3条）
  it("{diagnosis='上感'} → title='常见病健康宣教', content='遵医嘱用药、注意休息、均衡饮食'", () => {
    const input: AiPatientEduInputV14 = { diagnosis: "上感" };
    const result = generatePatientEduByAi(input);
    expect(result.title).toBe("常见病健康宣教");
    expect(result.content).toBe("遵医嘱用药、注意休息、均衡饮食");
  });
});

describe("buildAiPatientEduReport 构建教育材料报告", () => {
  // 手算：{title='心梗患者居家康复指南', content='按时服药、定期复查、避免剧烈运动、保持情绪稳定'}
  // 手算：透传 title + content
  it("{title='心梗患者居家康复指南', content='...'} → 正确返回（透传）", () => {
    const report = buildAiPatientEduReport({
      title: "心梗患者居家康复指南",
      content: "按时服药、定期复查、避免剧烈运动、保持情绪稳定",
    });
    expect(report.title).toBe("心梗患者居家康复指南");
    expect(report.content).toBe("按时服药、定期复查、避免剧烈运动、保持情绪稳定");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-patient-edu auth:true", () => {
    const def = (emrAiPatientEduV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-patient-edu");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
