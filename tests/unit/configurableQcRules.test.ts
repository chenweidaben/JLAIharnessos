/**
 * 健澜科技 jlmedaios - 可配置质控规则单测（M460 大三甲深度升级）
 *
 * 测试默认规则数、enabled 过滤、author 缺失命中扣分、空记录 score=100。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import { evaluateConfigurableRules, getDefaultRules, type QcRule } from "../../src/knowledge/qc/configurableQcRules";
import type { RecordLike } from "../../src/knowledge/qc/medicalRecordQc";

describe("getDefaultRules", () => {
  it("默认规则数 = 7", () => {
    const rules = getDefaultRules();
    expect(rules.length).toBe(7);
  });
});

describe("enabled 过滤", () => {
  it("CR-007 enabled=false → enabledCount=6", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {},
      authorId: null,
    };
    const result = evaluateConfigurableRules(record);
    expect(result.enabledCount).toBe(6);
  });
});

describe("author 缺失命中扣分", () => {
  it("authorId 缺失 → 命中 CR-003，扣分 8", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        diagnosis: "肺炎",
        admissionDate: "2026-10-18",
        chiefComplaint: "咳嗽3天",
        admissionNumber: "ZY20261018001",
      },
      plainText: "患者男性，50岁，因咳嗽3天入院，查体：双肺呼吸音粗",
      authorId: null,
    };
    const result = evaluateConfigurableRules(record);
    const hitCr003 = result.issues.find((i) => i.ruleId === "CR-003");
    expect(hitCr003).toBeDefined();
    expect(result.score).toBe(92);
  });
});

describe("空记录（rules=[]）", () => {
  it("rules=[] → score=100", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {},
      authorId: null,
    };
    const result = evaluateConfigurableRules(record, []);
    expect(result.score).toBe(100);
    expect(result.enabledCount).toBe(0);
    expect(result.hitCount).toBe(0);
  });
});

describe("完整记录", () => {
  it("所有字段齐全 → score=100", () => {
    const record: RecordLike = {
      recordType: "admission",
      content: {
        diagnosis: "肺炎",
        admissionDate: "2026-10-18",
        chiefComplaint: "咳嗽3天",
        admissionNumber: "ZY20261018001",
      },
      plainText: "患者男性，50岁，因咳嗽3天入院，查体：双肺呼吸音粗，闻及湿啰音",
      authorId: "dr-001",
    };
    const result = evaluateConfigurableRules(record);
    expect(result.score).toBe(100);
    expect(result.hitCount).toBe(0);
  });
});
