/**
 * 健澜科技 jlmedaios - 数字孪生纯函数单测（M232-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  build3DFacilityMap,
  buildDigitalTwinReport,
  simulatePatientFlow,
} from "../../src/bff/aggregators/digitalTwinReportAggregator";

describe("build3DFacilityMap", () => {
  it("主院区 → 12建筑", () => {
    expect(build3DFacilityMap("主院区").buildings).toBe(12);
  });
});

describe("simulatePatientFlow", () => {
  it("高峰场景 → 等待60分钟", () => {
    expect(simulatePatientFlow("高峰").waitTime).toBe(60);
  });

  it("平峰场景 → 等待30分钟", () => {
    expect(simulatePatientFlow("平峰").waitTime).toBe(30);
  });
});

describe("buildDigitalTwinReport", () => {
  it("生成院区数据", () => {
    const r = buildDigitalTwinReport("30d");
    expect(r.campus.buildings).toBeGreaterThan(0);
  });

  it("生成孪生场景数据", () => {
    const r = buildDigitalTwinReport("30d");
    expect(r.twin.or).toBe(true);
  });

  it("生成仿真数据", () => {
    const r = buildDigitalTwinReport("30d");
    expect(r.simulation.process).toBe(true);
  });

  it("生成建议", () => {
    const r = buildDigitalTwinReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
