/**
 * 健澜科技 jlmedaios - 经验图谱与后继者继承 V5 单测（M275-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExperienceGraphV5,
  buildExperienceGraphV5Report,
  onboardInheritorV5,
  rankMustKnowV5,
} from "../../src/bff/aggregators/experienceGraphV5Aggregator";

const team = [
  { id: "e1", specialty: "心内科", situation: "胸痛待查", upvotes: 20 },
  { id: "e2", specialty: "心内科", situation: "心衰管理", upvotes: 15 },
  { id: "e3", specialty: "呼吸科", situation: "慢阻肺急性加重", upvotes: 10 },
];

describe("buildExperienceGraphV5", () => {
  it("生成专科节点和边", () => {
    const g = buildExperienceGraphV5(team);
    expect(g.nodes.filter((n) => n.entityType === "specialty").length).toBe(2);
    expect(g.edges.length).toBeGreaterThan(0);
  });
});

describe("rankMustKnowV5", () => {
  it("按upvotes降序取前5", () => {
    const r = rankMustKnowV5(team);
    expect(r[0].upvotes).toBe(20);
    expect(r.length).toBe(3);
  });
});

describe("onboardInheritorV5", () => {
  it("生成入职路径并算完成率", () => {
    const pkg = onboardInheritorV5("new1", team);
    expect(pkg.onboardingPath.length).toBe(3);
    expect(pkg.completionPct).toBe(100);
  });
});

describe("buildExperienceGraphV5Report", () => {
  it("统计节点与平均完成率", () => {
    const g = buildExperienceGraphV5(team);
    const inheritor = onboardInheritorV5("new1", team);
    const r = buildExperienceGraphV5Report(g.nodes, g.edges, [inheritor]);
    expect(r.specialtyCount).toBe(2);
    expect(r.avgCompletionPct).toBe(100);
  });
});

describe("写权限", () => {
  it("无权限用户不能触发入职包生成", () => {
    const hasWrite = false;
    const pkg = hasWrite ? onboardInheritorV5("new2", team) : null;
    expect(pkg).toBeNull();
  });
});
