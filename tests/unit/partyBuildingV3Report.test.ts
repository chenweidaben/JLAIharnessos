/**
 * 健澜科技 jlmedaios - 党建 V3 纯函数单测（M245-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessPartyBuildingScoreV3,
  buildPartyBuildingV3Report,
  trackOrganizationalLifeV3,
} from "../../src/bff/aggregators/partyBuildingV3ReportAggregator";

describe("assessPartyBuildingScoreV3", () => {
  it("四项均90 → 示范", () => {
    expect(assessPartyBuildingScoreV3({ organization: 90, ideology: 90, integrity: 90, integration: 90 }).level).toBe("示范");
  });
});

describe("trackOrganizationalLifeV3", () => {
  it("支部12党课4委员会12 → 合规", () => {
    expect(trackOrganizationalLifeV3({ branch: 12, lesson: 4, committee: 12 }).compliant).toBe(true);
  });
});

describe("buildPartyBuildingV3Report", () => {
  it("生成组织数据", () => {
    const r = buildPartyBuildingV3Report("30d");
    expect(r.organization.partyMembers).toBeGreaterThan(0);
  });

  it("生成发展数据", () => {
    const r = buildPartyBuildingV3Report("30d");
    expect(r.development.newMembers).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPartyBuildingV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
