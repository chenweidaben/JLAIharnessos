/**
 * 健澜科技 jlmedaios - 病历类型扩展单测（M460 大三甲深度升级）
 *
 * 测试新增的 firstProgressNote / rescueRecord / consultationNote 等类型的段落完整性检查能正确命中缺失段落，空态返回 0。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import { evaluateRecord, type RecordLike } from "../../src/knowledge/qc/medicalRecordQc";

describe("firstProgressNote 首次病程记录", () => {
  it("缺少初步诊断 → block issue", () => {
    const record: RecordLike = {
      recordType: "firstProgressNote",
      content: {
        caseFeatures: "患者男性，60岁，因反复胸闷3天入院",
        treatmentPlan: "完善检查，对症治疗",
      },
      authorId: "dr-001",
      createdAt: "2026-10-18T10:00:00Z",
    };
    const result = evaluateRecord(record);
    const missingDiag = result.issues.find((i) => i.section === "preliminaryDiagnosis");
    expect(missingDiag).toBeDefined();
    expect(missingDiag?.severity).toBe("block");
  });
});

describe("rescueRecord 抢救记录", () => {
  it("缺少抢救措施 → block issue", () => {
    const record: RecordLike = {
      recordType: "rescueRecord",
      content: {
        rescueReason: "患者突发心跳骤停",
        rescueResult: "抢救成功，恢复自主心律",
      },
      authorId: "dr-001",
      createdAt: "2026-10-18T10:00:00Z",
    };
    const result = evaluateRecord(record);
    const missingMeasures = result.issues.find((i) => i.section === "rescueMeasures");
    expect(missingMeasures).toBeDefined();
    expect(missingMeasures?.severity).toBe("block");
  });
});

describe("consultationNote 会诊记录", () => {
  it("缺少会诊意见 → block issue", () => {
    const record: RecordLike = {
      recordType: "consultationNote",
      content: {
        consultationDiagnosis: "冠心病",
        suggestion: "建议抗血小板治疗",
      },
      authorId: "dr-001",
      createdAt: "2026-10-18T10:00:00Z",
    };
    const result = evaluateRecord(record);
    const missingOpinion = result.issues.find((i) => i.section === "consultationOpinion");
    expect(missingOpinion).toBeDefined();
    expect(missingOpinion?.severity).toBe("block");
  });
});

describe("空态记录", () => {
  it("空 content → 全文过短 issue", () => {
    const record: RecordLike = {
      recordType: "firstProgressNote",
      content: {},
      authorId: "dr-001",
      createdAt: "2026-10-18T10:00:00Z",
    };
    const result = evaluateRecord(record);
    expect(result.issues.length).toBeGreaterThan(0);
    const emptyIssue = result.issues.find((i) => i.ruleId === "record.empty");
    expect(emptyIssue).toBeDefined();
  });
});

describe("完整记录", () => {
  it("所有必备段落齐全 → 无缺失段落 block issue", () => {
    const record: RecordLike = {
      recordType: "firstProgressNote",
      content: {
        caseFeatures: "患者男性，60岁，因反复胸闷3天入院，既往高血压病史5年",
        preliminaryDiagnosis: "1. 冠心病 2. 高血压病2级",
        treatmentPlan: "完善冠脉造影，抗血小板，调脂治疗",
      },
      authorId: "dr-001",
      createdAt: "2026-10-18T10:00:00Z",
    };
    const result = evaluateRecord(record);
    const missingBlockIssues = result.issues.filter((i) => i.severity === "block" && i.category === "completeness");
    expect(missingBlockIssues.length).toBe(0);
  });
});
