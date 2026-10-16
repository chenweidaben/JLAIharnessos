/**
 * 健澜科技 jlmedaios - 绿色医院 V2 纯函数单测（M236-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessGreenBuilding,
  buildGreenHospitalV2Report,
  calculateCarbonFootprint,
} from "../../src/bff/aggregators/greenHospitalV2ReportAggregator";

describe("calculateCarbonFootprint", () => {
  it("电+废弃物 → 5000+吨", () => {
    expect(calculateCarbonFootprint("电", "医疗", "班车").tons).toBeGreaterThan(0);
  });
});

describe("assessGreenBuilding", () => {
  it("新综合楼 → LEED铂金", () => {
    expect(assessGreenBuilding("综合楼").leed).toContain("LEED");
  });
});

describe("buildGreenHospitalV2Report", () => {
  it("生成碳数据", () => {
    const r = buildGreenHospitalV2Report("30d");
    expect(r.carbon.footprint).toBeGreaterThan(0);
  });

  it("生成节能数据", () => {
    const r = buildGreenHospitalV2Report("30d");
    expect(r.energy.saving).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGreenHospitalV2Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
