/**
 * 健澜科技 jlmedaios - NLP 病历要素抽取纯函数单测（M461-C）
 *
 * 测试主诉抽取命中"发热、咳嗽"两个症状、时间表达式"3天前"解析出 durationDays=3、诊断抽取从"初步诊断：社区获得性肺炎；高血压"抽出 2 个诊断、否定词检测"否认胸痛"标注胸痛为否定、空文本返回空结构不报错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  detectNegation,
  extractChiefComplaint,
  extractDiagnoses,
  extractMedicalRecordElements,
  extractPresentIllnessTimeline,
} from "../../src/knowledge/qc/nlpExtraction";

describe("主诉抽取", () => {
  it("命中'发热、咳嗽'两个症状", () => {
    const result = extractChiefComplaint("发热3天，伴咳嗽咳痰");
    expect(result.symptoms).toContain("发热");
    expect(result.symptoms).toContain("咳嗽");
    expect(result.symptoms.length).toBe(2);
  });
});

describe("时间表达式解析", () => {
  // 手算："3天前" → durationDays = 3
  it("'3天前' → durationDays = 3", () => {
    const result = extractPresentIllnessTimeline("患者3天前出现发热");
    expect(result.durationDays).toBe(3);
    expect(result.onsetTime).toBe("3天前");
  });
});

describe("诊断抽取", () => {
  // 手算：按 ;；分割，"社区获得性肺炎" + "高血压" = 2 个诊断
  it("从'初步诊断：社区获得性肺炎；高血压'抽出 2 个诊断", () => {
    const diagnoses = extractDiagnoses("初步诊断：社区获得性肺炎；高血压");
    expect(diagnoses.length).toBe(2);
    expect(diagnoses[0]).toBe("社区获得性肺炎");
    expect(diagnoses[1]).toBe("高血压");
  });
});

describe("否定词检测", () => {
  it("'否认胸痛' 标注胸痛为否定", () => {
    const negations = detectNegation("否认胸痛，无呼吸困难");
    expect(negations).toContain("胸痛");
  });
});

describe("空文本", () => {
  it("空文本返回空结构不报错", () => {
    const result = extractMedicalRecordElements("");
    expect(result.chiefComplaint.symptoms).toEqual([]);
    expect(result.diagnoses).toEqual([]);
    expect(result.medications).toEqual([]);
    expect(result.procedures).toEqual([]);
    expect(result.negations).toEqual([]);
  });
});
