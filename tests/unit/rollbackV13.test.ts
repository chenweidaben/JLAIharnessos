/**
 * 健澜科技 jlmedaios - 错误经验拦截与回滚 V13 单测（M299-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRollbackReportV13,
  flagSuggestionsV13,
  rollbackExperienceV13,
  type AiSuggestionV13,
} from "../../src/bff/aggregators/rollbackV13Aggregator";
import { rollbackV13Routes } from "../../src/bff/routes/rollbackV13";

const suggestions: AiSuggestionV13[] = [
  { suggestionId: "s-1", linkedExperienceId: "e-1", content: "抗凝", status: "active" },
  { suggestionId: "s-2", linkedExperienceId: "e-2", content: "保温", status: "active" },
  { suggestionId: "s-3", linkedExperienceId: "e-1", content: "华法林", status: "active" },
];

describe("rollbackExperienceV13", () => {
  it("返回 status=rolledback + 原因", () => {
    const r = rollbackExperienceV13("e-1", "用药错误");
    expect(r.status).toBe("rolledback");
    expect(r.reason).toBe("用药错误");
  });
});

describe("flagSuggestionsV13", () => {
  it("e-1 匹配的2条 → needHumanReview，e-2 不变", () => {
    const flagged = flagSuggestionsV13(suggestions, "e-1");
    expect(flagged[0].status).toBe("needHumanReview");
    expect(flagged[1].status).toBe("active");
    expect(flagged[2].status).toBe("needHumanReview");
  });
  it("空态 → 空数组", () => {
    expect(flagSuggestionsV13([], "e-1").length).toBe(0);
  });
});

describe("buildRollbackReportV13", () => {
  it("报告含 experienceId/reason/flaggedCount=2", () => {
    const r = rollbackExperienceV13("e-1", "用药错误");
    const report = buildRollbackReportV13(r, 2);
    expect(report.experienceId).toBe("e-1");
    expect(report.flaggedCount).toBe(2);
    expect(report.summary).toContain("2 条建议");
  });
});

describe("rollbackV13Routes 写路由", () => {
  it("POST /api/v1/experience/:id/rollback 路由存在且 auth:true", () => {
    const route = rollbackV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/experience/:id/rollback",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
