/**
 * 健澜科技 jlmedaios - 过期经验复核工作流 V13 单测（M296-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReviewQueueV13,
  buildReviewTaskV13,
  resolveReviewTaskV13,
  type ReviewTaskV13,
  type StaleExperienceV13,
} from "../../src/bff/aggregators/experienceReviewV13Aggregator";
import { experienceReviewV13Routes } from "../../src/bff/routes/experienceReviewV13";

const stale: StaleExperienceV13[] = [
  { experienceId: "e-1", title: "房颤", monthsAgo: 30, author: "张主任" },
  { experienceId: "e-2", title: "VTE", monthsAgo: 40, author: "李医生" },
  { experienceId: "e-3", title: "术后", monthsAgo: 25, author: "王医生" },
];

describe("buildReviewTaskV13", () => {
  it("3条stale→3个pending任务", () => {
    const tasks = buildReviewTaskV13(stale);
    expect(tasks.length).toBe(3);
    expect(tasks.every((t) => t.status === "pending")).toBe(true);
  });
});

describe("resolveReviewTaskV13", () => {
  it("confirm → status=confirmed", () => {
    const tasks = buildReviewTaskV13(stale);
    const r = resolveReviewTaskV13(tasks[0], "confirm");
    expect(r.status).toBe("confirmed");
  });
  it("outdated → status=archived", () => {
    const tasks = buildReviewTaskV13(stale);
    const r = resolveReviewTaskV13(tasks[1], "outdated");
    expect(r.status).toBe("archived");
  });
});

describe("buildReviewQueueV13", () => {
  it("pending=3，overdue=1（仅 e-2 monthsAgo=40>30）", () => {
    const tasks: ReviewTaskV13[] = buildReviewTaskV13(stale);
    const q = buildReviewQueueV13(tasks);
    expect(q.pendingCount).toBe(3);
    expect(q.overdueCount).toBe(1);
  });
});

describe("experienceReviewV13Routes 写路由", () => {
  it("POST /api/v1/experience-review/:id/resolve 路由存在且 auth:true", () => {
    const route = experienceReviewV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/experience-review/:id/resolve",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
