/**
 * 健澜科技 jlmedaios - AI 内涵逻辑一致性检查单测（M460 大三甲深度升级）
 *
 * 测试主诉现病史呼应不通过、诊断用药不匹配、时间逻辑矛盾、过敏史冲突、空记录 passed。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkAllergyConsistency,
  checkChiefComplaintVsPresentIllness,
  checkDiagnosisVsMedication,
  checkTimeLogic,
  evaluateIntrinsicQc,
} from "../../src/knowledge/qc/intrinsicQc";
import type { RecordLike } from "../../src/knowledge/qc/medicalRecordQc";

describe("主诉现病史呼应不通过", () => {
  it("主诉关键词不在现病史中 → 返回 issue", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        chiefComplaint: "腹痛1天",
        presentIllness: "患者发热3天，伴咳嗽咳痰，无腹痛",
      },
    };
    const issue = checkChiefComplaintVsPresentIllness(record);
    expect(issue).toBeDefined();
    expect(issue?.checkId).toBe("INT-001");
  });
});

describe("诊断用药不匹配", () => {
  it("诊断含肺炎但无抗感染药 → 返回 issue", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        diagnosis: "肺炎",
        medications: ["生理盐水"],
      },
    };
    const issue = checkDiagnosisVsMedication(record);
    expect(issue).toBeDefined();
    expect(issue?.checkId).toBe("INT-002");
  });
});

describe("时间逻辑矛盾", () => {
  it("recordTime 早于 admissionTime → 返回 block issue", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        admissionTime: "2026-10-18T10:00:00Z",
        recordTime: "2026-10-18T08:00:00Z",
      },
    };
    const issue = checkTimeLogic(record);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("block");
  });
});

describe("过敏史冲突", () => {
  it("过敏史记录青霉素但医嘱含青霉素 → 返回 block issue", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        allergies: ["青霉素"],
        medications: ["青霉素"],
      },
    };
    const issue = checkAllergyConsistency(record);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("block");
  });
});

describe("空记录", () => {
  it("空 content → passed=true, score=100", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {},
    };
    const result = evaluateIntrinsicQc(record);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues.length).toBe(0);
  });
});
