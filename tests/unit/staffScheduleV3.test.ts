/**
 * 健澜科技 jlmedaios - 人力排班与调度优化 V3 单测（M277-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStaffScheduleV3Report,
  fairnessScoreV3,
  matchSkillV3,
  optimizeScheduleV3,
  type ShiftDemand,
  type Staff,
} from "../../src/bff/aggregators/staffScheduleV3Aggregator";

const staff: Staff[] = [
  { staffId: "s1", name: "张三", skills: ["护理", "心电"], shiftCount: 4 },
  { staffId: "s2", name: "李四", skills: ["护理"], shiftCount: 6 },
  { staffId: "s3", name: "王五", skills: ["护理", "抢救"], shiftCount: 2 },
];

const demand: ShiftDemand[] = [
  { date: "d1", shift: "白班", required: 2, requiredSkill: "护理" },
  { date: "d1", shift: "夜班", required: 1, requiredSkill: "抢救" },
];

describe("matchSkillV3", () => {
  it("s1具备护理技能→true", () => {
    expect(matchSkillV3("护理", staff[0])).toBe(true);
  });
  it("s2不具备抢救技能→false", () => {
    expect(matchSkillV3("抢救", staff[1])).toBe(false);
  });
});

describe("optimizeScheduleV3", () => {
  it("按需求分配3个岗位且优先低shiftCount", () => {
    const assignments = optimizeScheduleV3(demand, staff);
    expect(assignments.length).toBe(3);
    // s3 shiftCount最低(2)且会被优先分配
    expect(assignments[0].staffId).toBe("s3");
  });
});

describe("fairnessScoreV3", () => {
  it("排班越均衡分数越高", () => {
    const balanced: Staff[] = [
      { staffId: "a", name: "a", skills: [], shiftCount: 5 },
      { staffId: "b", name: "b", skills: [], shiftCount: 5 },
    ];
    const score = fairnessScoreV3([], balanced);
    expect(score).toBe(100);
  });
});

describe("buildStaffScheduleV3Report", () => {
  it("生成覆盖率与公平性报告", () => {
    const assignments = optimizeScheduleV3(demand, staff);
    const r = buildStaffScheduleV3Report(assignments, demand, staff);
    expect(r.coverageRate).toBe(100);
    expect(r.fairnessScore).toBeGreaterThanOrEqual(0);
  });
});
