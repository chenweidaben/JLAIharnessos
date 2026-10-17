/**
 * 健澜科技 jlmedaios - 知识资产生命周期总览 V13 单测（M296-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildKnowledgeLifecycleV13,
  computeLifecycleHealthV13,
  identifyLifecycleGapV13,
  type LifecycleInputV13,
} from "../../src/bff/aggregators/knowledgeLifecycleV13Aggregator";
import { knowledgeLifecycleV13Routes } from "../../src/bff/routes/knowledgeLifecycleV13";

const experiences: LifecycleInputV13[] = [
  { experienceId: "e-1", bucket: "fresh" },
  { experienceId: "e-2", bucket: "fresh" },
  { experienceId: "e-3", bucket: "aging" },
  { experienceId: "e-4", bucket: "stale" },
  { experienceId: "e-5", bucket: "archive" },
];

describe("buildKnowledgeLifecycleV13", () => {
  it("5条→fresh=2 stale=1 archived=1 pending=3 total=5", () => {
    const o = buildKnowledgeLifecycleV13(experiences, 3);
    expect(o.freshCount).toBe(2);
    expect(o.staleCount).toBe(1);
    expect(o.archivedCount).toBe(1);
    expect(o.pendingReviewCount).toBe(3);
    expect(o.total).toBe(5);
  });
  it("空态→全0", () => {
    const o = buildKnowledgeLifecycleV13([], 0);
    expect(o.total).toBe(0);
    expect(o.freshCount).toBe(0);
  });
});

describe("computeLifecycleHealthV13", () => {
  it("fresh=2/total=5 → 40", () => {
    const o = buildKnowledgeLifecycleV13(experiences, 3);
    expect(computeLifecycleHealthV13(o)).toBe(40);
  });
});

describe("identifyLifecycleGapV13", () => {
  it("stale=1 <= fresh=2 且 pending=3 <= 5 → 无缺口", () => {
    const o = buildKnowledgeLifecycleV13(experiences, 3);
    expect(identifyLifecycleGapV13(o)).toEqual([]);
  });
  it("stale=5 > fresh=2 且 pending=6>5 → 两条缺口", () => {
    const o = buildKnowledgeLifecycleV13(
      [
        ...experiences,
        { experienceId: "s-1", bucket: "stale" },
        { experienceId: "s-2", bucket: "stale" },
        { experienceId: "s-3", bucket: "stale" },
        { experienceId: "s-4", bucket: "stale" },
      ],
      6,
    );
    const gaps = identifyLifecycleGapV13(o);
    expect(gaps.length).toBe(2);
  });
});

describe("knowledgeLifecycleV13Routes 读路由", () => {
  it("GET /api/v1/knowledge-lifecycle 路由存在且 auth:true", () => {
    const route = knowledgeLifecycleV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/knowledge-lifecycle",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
