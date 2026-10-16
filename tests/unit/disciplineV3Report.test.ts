/**
 * 健澜科技 jlmedaios - 学科建设 V3 纯函数单测（M242-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessDisciplineLevelV3,
  buildDisciplinePlanV3,
  buildDisciplineV3Report,
} from "../../src/bff/aggregators/disciplineV3ReportAggregator";

describe("assessDisciplineLevelV3", () => {
  it("国家级排名2 → 顶尖", () => {
    expect(assessDisciplineLevelV3({ name: "心血管", level: "国家级", rank: 2 }).top).toBe(true);
  });
});

describe("buildDisciplinePlanV3", () => {
  it("当前省级目标国家级 → 有差距", () => {
    expect(buildDisciplinePlanV3("省级", "国家级").gap).toBe(true);
  });
});

describe("buildDisciplineV3Report", () => {
  it("生成重点专科数据", () => {
    const r = buildDisciplineV3Report("30d");
    expect(r.keySpecialty.national).toBeGreaterThan(0);
  });

  it("生成专病中心数据", () => {
    const r = buildDisciplineV3Report("30d");
    expect(r.centers.chest).toBeGreaterThanOrEqual(0);
  });

  it("生成建议", () => {
    const r = buildDisciplineV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
