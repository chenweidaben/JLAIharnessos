/**
 * 健澜科技 jlmedaios - 病种模板智能推荐 V14 单测（M525-B）
 *
 * 测试 buildDiseaseRecommend 构建推荐、recommendDiseaseTemplate 病种推荐、buildDiseaseRecommendReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDiseaseRecommend,
  buildDiseaseRecommendReport,
  recommendDiseaseTemplate,
  type CandidateTemplateV14,
  type DiseaseRecommendInputV14,
} from "../../src/bff/aggregators/emrTemplateDiseaseRecommendV14Aggregator";
import { emrTemplateDiseaseRecommendV14Routes } from "../../src/bff/routes/emrTemplateDiseaseRecommendV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDiseaseRecommend 构建推荐", () => {
  // 手算：diseaseName='冠心病', dept='心内科' → 正确构建
  it("diseaseName='冠心病', dept='心内科' → 正确构建", () => {
    const recommend = buildDiseaseRecommend("冠心病", "心内科");
    expect(recommend.diseaseName).toBe("冠心病");
    expect(recommend.dept).toBe("心内科");
  });
});

describe("recommendDiseaseTemplate 多推荐", () => {
  // 手算：templates=[冠心病入院模板(85), 高血压门诊模板(70), 糖尿病随访模板(40)]
  // 手算：85>=60 ✓, 70>=60 ✓, 40<60 ✗ → recommendCount=2
  // 手算：matchScore 最高 = 85 → topTemplate='冠心病入院模板'
  it("templates=[冠心病入院模板(85), 高血压门诊模板(70), 糖尿病随访模板(40)] → recommendCount=2, topTemplate='冠心病入院模板'", () => {
    const templates: CandidateTemplateV14[] = [
      { name: "冠心病入院模板", dept: "心内科", matchScore: 85 },
      { name: "高血压门诊模板", dept: "心内科", matchScore: 70 },
      { name: "糖尿病随访模板", dept: "内分泌科", matchScore: 40 },
    ];
    const input: DiseaseRecommendInputV14 = { diseaseName: "冠心病", templates };
    const result = recommendDiseaseTemplate(input);
    expect(result.recommendCount).toBe(2);
    expect(result.topTemplate).toBe("冠心病入院模板");
  });
});

describe("recommendDiseaseTemplate 仅1推荐", () => {
  // 手算：templates=[冠心病入院模板(85), 糖尿病随访模板(40)]
  // 手算：85>=60 ✓, 40<60 ✗ → recommendCount=1
  // 手算：matchScore 最高 = 85 → topTemplate='冠心病入院模板'
  it("templates=[冠心病入院模板(85), 糖尿病随访模板(40)] → recommendCount=1, topTemplate='冠心病入院模板'", () => {
    const templates: CandidateTemplateV14[] = [
      { name: "冠心病入院模板", dept: "心内科", matchScore: 85 },
      { name: "糖尿病随访模板", dept: "内分泌科", matchScore: 40 },
    ];
    const input: DiseaseRecommendInputV14 = { diseaseName: "冠心病", templates };
    const result = recommendDiseaseTemplate(input);
    expect(result.recommendCount).toBe(1);
    expect(result.topTemplate).toBe("冠心病入院模板");
  });
});

describe("buildDiseaseRecommendReport 构建报告", () => {
  // 手算：{topTemplate:'冠心病入院模板', recommendCount:2}
  // 手算：透传 topTemplate + recommendCount
  it("{topTemplate:'冠心病入院模板', recommendCount:2} → 正确返回（透传）", () => {
    const report = buildDiseaseRecommendReport({ topTemplate: "冠心病入院模板", recommendCount: 2 });
    expect(report.topTemplate).toBe("冠心病入院模板");
    expect(report.recommendCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-disease-recommend auth:true", () => {
    const def = (emrTemplateDiseaseRecommendV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-disease-recommend");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
