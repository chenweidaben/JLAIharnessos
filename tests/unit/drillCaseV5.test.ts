/**
 * 健澜科技 jlmedaios - 虚拟病例演练与团队复盘 V5 单测（M276-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDebriefV5,
  buildDrillCaseV5Report,
  generateDrillCaseV5,
  scoreDrillV5,
  type DrillCase,
} from "../../src/bff/aggregators/drillCaseV5Aggregator";

describe("generateDrillCaseV5", () => {
  it("hard难度比easy多两步", () => {
    const easy = generateDrillCaseV5("心内科", "easy");
    const hard = generateDrillCaseV5("心内科", "hard");
    expect(hard.correctPath.length).toBeGreaterThan(easy.correctPath.length);
  });
});

describe("scoreDrillV5", () => {
  it("5步全对→score=100", () => {
    const correct = ["a", "b", "c", "d", "e"];
    expect(scoreDrillV5(["a", "b", "c", "d", "e"], correct).score).toBe(100);
  });
  it("漏1步→score=80", () => {
    const correct = ["a", "b", "c", "d", "e"];
    const r = scoreDrillV5(["a", "b", "c", "d"], correct);
    expect(r.score).toBe(80);
    expect(r.missed).toContain("e");
  });
});

describe("buildDebriefV5", () => {
  it("score=50→未通过", () => {
    expect(buildDebriefV5({ score: 50, missed: ["e"] }).pass).toBe(false);
  });
});

describe("buildDrillCaseV5Report", () => {
  it("按专科和难度统计通过率", () => {
    const list: DrillCase[] = [
      { id: "d1", title: "t1", specialty: "心内科", difficulty: "easy", virtualSteps: [], correctPath: [], teamId: "g1", outcomeScore: 80, debriefNotes: "" },
      { id: "d2", title: "t2", specialty: "呼吸科", difficulty: "hard", virtualSteps: [], correctPath: [], teamId: "g1", outcomeScore: 50, debriefNotes: "" },
    ];
    const r = buildDrillCaseV5Report(list);
    expect(r.bySpecialty["心内科"]).toBe(1);
    expect(r.passRate).toBe(50);
  });
});
