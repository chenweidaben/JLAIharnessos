/**
 * 健澜科技 jlmedaios - 病历主诉结构化提取 V14 单测（M529-A）
 *
 * 测试 buildChiefComplaintNlp 构建提取、extractChiefComplaintStruct 主诉结构化提取、buildChiefComplaintNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildChiefComplaintNlp,
  buildChiefComplaintNlpReport,
  extractChiefComplaintStruct,
  type ChiefComplaintNlpInputV14,
} from "../../src/bff/aggregators/emrChiefComplaintNlpV14Aggregator";
import { emrChiefComplaintNlpV14Routes } from "../../src/bff/routes/emrChiefComplaintNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildChiefComplaintNlp 构建提取", () => {
  // 手算：recordId='REC060', dept='心内科' → 正确构建
  it("recordId='REC060', dept='心内科' → 正确构建", () => {
    const nlp = buildChiefComplaintNlp("REC060", "心内科");
    expect(nlp.recordId).toBe("REC060");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractChiefComplaintStruct 正常提取", () => {
  // 手算：{rawText='胸痛 3天'}
  // 手算：split(' ') = ['胸痛', '3天'] → symptom='胸痛', duration='3天'
  // 手算：hasSymptom = symptom !== '' = true
  it("{rawText='胸痛 3天'} → symptom='胸痛', duration='3天', hasSymptom=true", () => {
    const input: ChiefComplaintNlpInputV14 = { rawText: "胸痛 3天" };
    const result = extractChiefComplaintStruct(input);
    expect(result.symptom).toBe("胸痛");
    expect(result.duration).toBe("3天");
    expect(result.hasSymptom).toBe(true);
  });
});

describe("extractChiefComplaintStruct 仅症状", () => {
  // 手算：{rawText='头晕'}
  // 手算：split(' ') = ['头晕'] → symptom='头晕', duration=''（仅1段）
  // 手算：hasSymptom = symptom !== '' = true
  it("{rawText='头晕'} → symptom='头晕', duration='', hasSymptom=true", () => {
    const input: ChiefComplaintNlpInputV14 = { rawText: "头晕" };
    const result = extractChiefComplaintStruct(input);
    expect(result.symptom).toBe("头晕");
    expect(result.duration).toBe("");
    expect(result.hasSymptom).toBe(true);
  });
});

describe("buildChiefComplaintNlpReport 构建报告", () => {
  // 手算：{symptom:'胸痛', duration:'3天', hasSymptom:true}
  // 手算：fieldCount = 3（symptom + duration + hasSymptom）
  it("{symptom:'胸痛', duration:'3天', hasSymptom:true} → fieldCount=3", () => {
    const report = buildChiefComplaintNlpReport({
      symptom: "胸痛",
      duration: "3天",
      hasSymptom: true,
    });
    expect(report.hasSymptom).toBe(true);
    expect(report.fieldCount).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-chief-complaint-nlp auth:true", () => {
    const def = (emrChiefComplaintNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-chief-complaint-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
