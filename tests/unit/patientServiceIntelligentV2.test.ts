/**
 * 健澜科技 jlmedaios - 患者服务智能化 V2 纯函数单测（M233-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aiTriagePatient,
  buildPatientServiceIntelligentV2,
  predictPatientRisk,
} from "../../src/bff/aggregators/patientServiceIntelligentV2Aggregator";

describe("aiTriagePatient", () => {
  it("胸痛 → 心血管内科", () => {
    expect(aiTriagePatient("胸痛").department).toBe("心血管内科");
  });

  it("腹痛 → 消化内科", () => {
    expect(aiTriagePatient("腹痛").department).toBe("消化内科");
  });
});

describe("predictPatientRisk", () => {
  it("糖尿病+发热 → 高风险", () => {
    expect(predictPatientRisk("糖尿病", "发热").level).toBe("高");
  });

  it("无病史 → 低风险", () => {
    expect(predictPatientRisk("无", "正常").level).toBe("低");
  });
});

describe("buildPatientServiceIntelligentV2", () => {
  it("生成预问诊数据", () => {
    const r = buildPatientServiceIntelligentV2("30d");
    expect(r.preTriage.sessions).toBeGreaterThan(0);
  });

  it("生成AI助手数据", () => {
    const r = buildPatientServiceIntelligentV2("30d");
    expect(r.assistant.qa24h).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientServiceIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
