/**
 * 健澜科技 jlmedaios - 人才队伍 V3 纯函数单测（M242-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessTalentStructureV3,
  buildTalentPipelineV3,
  buildTalentV3Report,
} from "../../src/bff/aggregators/talentV3ReportAggregator";

describe("assessTalentStructureV3", () => {
  it("中青年>中年>领军 → 健康", () => {
    expect(assessTalentStructureV3({ leaders: 10, mid: 50, young: 200 }).healthy).toBe(true);
  });
});

describe("buildTalentPipelineV3", () => {
  it("各级人才合计 → 梯队", () => {
    expect(buildTalentPipelineV3({ academician: 1, yangtze: 3, distinguished: 10, young: 200 }).pipeline).toBe(214);
  });
});

describe("buildTalentV3Report", () => {
  it("生成领军人才数据", () => {
    const r = buildTalentV3Report("30d");
    expect(r.leaders.academician).toBeGreaterThanOrEqual(0);
  });

  it("生成后备人才数据", () => {
    const r = buildTalentV3Report("30d");
    expect(r.backup.director).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildTalentV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
