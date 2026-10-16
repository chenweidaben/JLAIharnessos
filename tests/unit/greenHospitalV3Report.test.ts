/**
 * 健澜科技 jlmedaios - 绿色医院 V3 纯函数单测（M246-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessGreenBuildingV3,
  buildGreenHospitalV3Report,
  calculateCarbonFootprintV3,
} from "../../src/bff/aggregators/greenHospitalV3ReportAggregator";

describe("calculateCarbonFootprintV3", () => {
  it("能源5000废弃500交通200 → 总5700", () => {
    expect(calculateCarbonFootprintV3(5000, 500, 200).total).toBe(5700);
  });
});

describe("assessGreenBuildingV3", () => {
  it("三项均90 → 三星", () => {
    expect(assessGreenBuildingV3({ leed: 90, energy: 90, water: 90 }).level).toBe("三星");
  });
});

describe("buildGreenHospitalV3Report", () => {
  it("生成碳数据", () => {
    const r = buildGreenHospitalV3Report("30d");
    expect(r.carbon.energy).toBeGreaterThan(0);
  });

  it("生成建筑数据", () => {
    const r = buildGreenHospitalV3Report("30d");
    expect(r.building.leed).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGreenHospitalV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
