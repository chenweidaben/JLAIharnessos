/**
 * 健澜科技 jlmedaios - 病历AI出院带药建议 V14 单测（M558-D，M558 收官）
 *
 * 测试 buildAiDischargeMedReco 构建 AI 出院带药建议、recommendDischargeMedByAi AI 出院带药建议、buildAiDischargeMedRecoReport 构建出院带药建议报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDischargeMedReco,
  buildAiDischargeMedRecoReport,
  recommendDischargeMedByAi,
  type AiDischargeMedRecoInputV14,
} from "../../src/bff/aggregators/emrAiDischargeMedRecoV14Aggregator";
import { emrAiDischargeMedRecoV14Routes } from "../../src/bff/routes/emrAiDischargeMedRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDischargeMedReco 构建 AI 出院带药建议", () => {
  // 手算：recordId='RECB057', dept='心内科' → 正确构建
  it("recordId='RECB057', dept='心内科' → 正确构建", () => {
    const base = buildAiDischargeMedReco("RECB057", "心内科");
    expect(base.recordId).toBe("RECB057");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendDischargeMedByAi 老年心梗", () => {
  // 手算：{diagnosis='急性心梗', patientAge=78}
  // 手算：medName = diagnosis.includes('心梗')=true → '阿司匹林肠溶片'
  // 手算：dosage = patientAge=78>=75 → '减半剂量'
  // 手算：days = diagnosis.includes('心梗')=true → 30
  it("{diagnosis='急性心梗', patientAge=78} → medName='阿司匹林肠溶片', dosage='减半剂量', days=30", () => {
    const input: AiDischargeMedRecoInputV14 = { diagnosis: "急性心梗", patientAge: 78 };
    const result = recommendDischargeMedByAi(input);
    expect(result.medName).toBe("阿司匹林肠溶片");
    expect(result.dosage).toBe("减半剂量");
    expect(result.days).toBe(30);
  });
});

describe("recommendDischargeMedByAi 普通", () => {
  // 手算：{diagnosis='上呼吸道感染', patientAge=30}
  // 手算：medName = 不含心梗/肺炎 → '布洛芬缓释胶囊'
  // 手算：dosage = patientAge=30<75 → '常规剂量'
  // 手算：days = 不含心梗 → 7
  it("{diagnosis='上呼吸道感染', patientAge=30} → medName='布洛芬缓释胶囊', dosage='常规剂量', days=7", () => {
    const input: AiDischargeMedRecoInputV14 = { diagnosis: "上呼吸道感染", patientAge: 30 };
    const result = recommendDischargeMedByAi(input);
    expect(result.medName).toBe("布洛芬缓释胶囊");
    expect(result.dosage).toBe("常规剂量");
    expect(result.days).toBe(7);
  });
});

describe("buildAiDischargeMedRecoReport 构建出院带药建议报告", () => {
  // 手算：{medName='阿司匹林肠溶片', dosage='减半剂量', days=30}
  // 手算：透传 medName + dosage + days
  it("{medName='阿司匹林肠溶片', dosage='减半剂量', days=30} → 正确返回（透传）", () => {
    const report = buildAiDischargeMedRecoReport({ medName: "阿司匹林肠溶片", dosage: "减半剂量", days: 30 });
    expect(report.medName).toBe("阿司匹林肠溶片");
    expect(report.dosage).toBe("减半剂量");
    expect(report.days).toBe(30);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-discharge-med-reco auth:true", () => {
    const def = (emrAiDischargeMedRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-discharge-med-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
