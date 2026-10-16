/**
 * 健澜科技 jlmedaios - AI 患者陪伴 V5 纯函数单测（M259-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPatientCompanionV5Report,
  monitorChronicDiseaseV5,
  predictAdherenceV5,
} from "../../src/bff/aggregators/patientCompanionV5ReportAggregator";

describe("predictAdherenceV5", () => {
  it("小学+70岁+qid+60天 → 高风险", () => {
    expect(predictAdherenceV5({ education: "小学", age: 70 }, { frequency: 4, duration: 60 }).risk).toBe("高风险");
  });
});

describe("monitorChronicDiseaseV5", () => {
  it("高血压+BP150 → 未达标预警", () => {
    expect(monitorChronicDiseaseV5({ condition: "高血压" }, { bp: 150 }).alert).toBe(true);
  });
});

describe("buildPatientCompanionV5Report", () => {
  it("生成慢病数据", () => {
    const r = buildPatientCompanionV5Report("30d");
    expect(r.chronic.htn).toBeGreaterThan(0);
  });

  it("生成随访数据", () => {
    const r = buildPatientCompanionV5Report("30d");
    expect(r.followup.wechat).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientCompanionV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
