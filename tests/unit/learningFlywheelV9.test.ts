/**
 * 健澜科技 jlmedaios - 跨角色经验复用与学习飞轮 V9 单测（M291-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLearningFlywheelV9,
  filterApplicableLessonsV9,
  transferLessonV9,
  type TransferredLessonV9,
} from "../../src/bff/aggregators/learningFlywheelV9Aggregator";
import { learningFlywheelV9Routes } from "../../src/bff/routes/learningFlywheelV9";

const seed: TransferredLessonV9[] = [
  { id: "tl-1", sourceRole: "doctor", targetRole: "nurse", condition: "急性心梗", lesson: "15分钟ECG", sourceCnt: 5 },
  { id: "tl-2", sourceRole: "doctor", targetRole: "pharma", condition: "急性心梗", lesson: "双联抗板", sourceCnt: 4 },
  { id: "tl-3", sourceRole: "doctor", targetRole: "manager", condition: "再灌注延迟", lesson: "D2B KPI", sourceCnt: 1 },
];

describe("transferLessonV9", () => {
  it("2条经验转译 doctor→nurse，id 自动生成", () => {
    const out = transferLessonV9("doctor", "nurse", [
      { condition: "c1", lesson: "l1", sourceCnt: 3 },
      { condition: "c2", lesson: "l2", sourceCnt: 2 },
    ]);
    expect(out.length).toBe(2);
    expect(out[0].sourceRole).toBe("doctor");
    expect(out[0].targetRole).toBe("nurse");
    expect(out[0].sourceCnt).toBe(3);
  });
});

describe("filterApplicableLessonsV9", () => {
  it("targetRole=nurse 仅返回1条", () => {
    const r = filterApplicableLessonsV9(seed, "nurse", {});
    expect(r.length).toBe(1);
    expect(r[0].id).toBe("tl-1");
  });
});

describe("buildLearningFlywheelV9", () => {
  it("3条转译覆盖3角色，高复用=2（5+4≥3）", () => {
    const f = buildLearningFlywheelV9(seed);
    expect(f.transferCount).toBe(3);
    expect(f.targetRoleCount).toBe(3);
    expect(f.highTransferCount).toBe(2);
  });
  it("空态→全部为0", () => {
    const f = buildLearningFlywheelV9([]);
    expect(f.transferCount).toBe(0);
    expect(f.targetRoleCount).toBe(0);
  });
});

describe("learningFlywheelV9Routes 写权限", () => {
  it("POST /api/v1/agent/transfer 路由存在且 auth:true", () => {
    const post = learningFlywheelV9Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/transfer");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
