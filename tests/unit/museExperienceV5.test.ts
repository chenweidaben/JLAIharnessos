/**
 * 健澜科技 jlmedaios - MUSE 个人经验沉淀闭环 V5 单测（M275-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMUSEExperienceV5Report,
  deduplicateExperienceV5,
  recordExperienceV5,
  scoreExperienceV5,
  type ExperienceRecord,
} from "../../src/bff/aggregators/museExperienceV5Aggregator";

const base: Omit<ExperienceRecord, "id" | "upvotes" | "downvotes" | "status"> = {
  userId: "u1",
  role: "doctor",
  specialty: "心内科",
  situation: "胸痛待查",
  decision: "首选心电图+肌钙蛋白",
  outcome: "排除心梗",
  lesson: "胸痛三联征需鉴别",
  evidenceRef: "guide-2023",
};

describe("recordExperienceV5", () => {
  it("返回草稿状态且id非空", () => {
    const r = recordExperienceV5(base);
    expect(r.status).toBe("draft");
    expect(r.id).toContain("exp-");
  });
});

describe("scoreExperienceV5", () => {
  it("upvotes10 downvotes2→score=80", () => {
    expect(scoreExperienceV5(10, 2)).toBe(80);
  });
  it("downvotes多于upvotes→score=0", () => {
    expect(scoreExperienceV5(1, 5)).toBe(0);
  });
});

describe("deduplicateExperienceV5", () => {
  it("同专科同场景同决策只保留一条", () => {
    const a = recordExperienceV5(base);
    const b = recordExperienceV5({ ...base, outcome: "不同" });
    expect(deduplicateExperienceV5([a, b]).length).toBe(1);
  });
});

describe("buildMUSEExperienceV5Report", () => {
  it("按角色统计并给出建议", () => {
    const list = [recordExperienceV5(base), recordExperienceV5({ ...base, role: "nurse" })];
    const r = buildMUSEExperienceV5Report(list);
    expect(r.total).toBe(2);
    expect(r.byRole.doctor).toBe(1);
  });
});
