/**
 * 健澜科技 jlmedaios - 新知识自动入库与指南更新监测 V5 单测（M276-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildKnowledgeIntakeV5Report,
  deduplicateKnowledgeV5,
  detectUpdateV5,
  extractKnowledgePointsV5,
  type KnowledgeIntake,
} from "../../src/bff/aggregators/knowledgeIntakeV5Aggregator";

describe("extractKnowledgePointsV5", () => {
  it("按句号切分要点", () => {
    const pts = extractKnowledgePointsV5("胸痛首选心电图。肌钙蛋白3小时复查。", "guideline");
    expect(pts.length).toBe(2);
  });
});

describe("deduplicateKnowledgeV5", () => {
  it("同dedupKey只保留一条", () => {
    const a = extractKnowledgePointsV5("胸痛首选心电图。", "guideline");
    const b = extractKnowledgePointsV5("胸痛首选心电图。", "guideline");
    expect(deduplicateKnowledgeV5([...a, ...b]).length).toBe(1);
  });
});

describe("detectUpdateV5", () => {
  it("新增一条且删除一条→changed=true", () => {
    const r = detectUpdateV5(["旧要点A"], ["旧要点A", "新要点B"]);
    expect(r.added.length).toBe(1);
    expect(r.changed).toBe(true);
  });
  it("无差异→changed=false", () => {
    expect(detectUpdateV5(["A"], ["A"]).changed).toBe(false);
  });
});

describe("buildKnowledgeIntakeV5Report", () => {
  it("按状态统计", () => {
    const list: KnowledgeIntake[] = [
      { id: "k1", sourceType: "guideline", title: "t1", sourceUrl: "u1", extractedPoints: [], status: "pending", reviewedBy: "" },
      { id: "k2", sourceType: "literature", title: "t2", sourceUrl: "u2", extractedPoints: [], status: "approved", reviewedBy: "x" },
    ];
    const r = buildKnowledgeIntakeV5Report(list);
    expect(r.pending).toBe(1);
    expect(r.approved).toBe(1);
  });
});
