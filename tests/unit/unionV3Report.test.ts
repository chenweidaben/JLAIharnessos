/**
 * 健澜科技 jlmedaios - 工会群团 V3 纯函数单测（M245-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessUnionSatisfactionV3,
  buildUnionV3Report,
  organizeUnionActivityV3,
} from "../../src/bff/aggregators/unionV3ReportAggregator";

describe("assessUnionSatisfactionV3", () => {
  it("满意度90参与80 → 均分85满意", () => {
    expect(assessUnionSatisfactionV3({ satisfaction: 90, participation: 80 }).satisfied).toBe(true);
  });
});

describe("organizeUnionActivityV3", () => {
  it("预算30000 → 批准", () => {
    expect(organizeUnionActivityV3({ name: "春游", attendees: 100, budget: 30000 }).approved).toBe(true);
  });
});

describe("buildUnionV3Report", () => {
  it("生成组织数据", () => {
    const r = buildUnionV3Report("30d");
    expect(r.organization.members).toBeGreaterThan(0);
  });

  it("生成福利数据", () => {
    const r = buildUnionV3Report("30d");
    expect(r.welfare.subsidy).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildUnionV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
