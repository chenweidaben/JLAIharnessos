/**
 * 健澜科技 jlmedaios - AI 内涵质控推理链单测（M461-D）
 *
 * 测试诊断-治疗三角一致性、用药-诊断匹配、时间连续性、完全一致记录、空记录。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkDiagnosisTreatmentConsistency,
  checkMedicationDiagnosisMatch,
  checkTimeContinuity,
  evaluateIntrinsicReasoning,
} from "../../src/knowledge/qc/intrinsicReasoning";
import type { RecordLike } from "../../src/knowledge/qc/medicalRecordQc";

describe("诊断-治疗三角一致性", () => {
  // 手算：命中 DTC major → 扣分 8 → score = 100-8 = 92
  it("诊断含肺炎但治疗无抗感染 → 命中 DTC major", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        diagnosis: "社区获得性肺炎",
        treatmentPlan: "对症治疗",
      },
    };
    const issue = checkDiagnosisTreatmentConsistency(record);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("major");
    expect(issue?.checkId).toBe("DTC");
  });
});

describe("用药-诊断匹配", () => {
  // 手算：命中 MDM minor → 扣分 3 → score = 100-3 = 97
  it("用药含胰岛素但诊断无糖尿病 → 命中 MDM minor", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        diagnosis: "高血压",
        medications: ["胰岛素"],
      },
    };
    const issue = checkMedicationDiagnosisMatch(record);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("minor");
    expect(issue?.checkId).toBe("MDM");
  });
});

describe("时间连续性", () => {
  // 手算：命中 TC block → 扣分 15 → score = 100-15 = 85
  it("首次病程早于入院 → 命中 TC block", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        admissionTime: "2026-10-18T10:00:00Z",
        firstProgressTime: "2026-10-18T08:00:00Z",
      },
    };
    const issue = checkTimeContinuity(record);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("block");
    expect(issue?.checkId).toBe("TC");
  });
});

describe("完全一致记录", () => {
  it("无 issue → score=100, passed=true", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        diagnosis: "社区获得性肺炎",
        treatmentPlan: "抗感染治疗",
        medications: ["头孢"],
        admissionTime: "2026-10-18T10:00:00Z",
        firstProgressTime: "2026-10-18T12:00:00Z",
      },
    };
    const result = evaluateIntrinsicReasoning(record);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.issues.length).toBe(0);
  });
});

describe("空记录", () => {
  it("空 content → passed=true 不报错", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {},
    };
    const result = evaluateIntrinsicReasoning(record);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues.length).toBe(0);
  });
});
