/**
 * 健澜科技 jlmedaios - 智慧医院 V3 纯函数单测（M231-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessSmartHospitalTrinity,
  buildSmartHospitalRoadmap,
  buildSmartHospitalV3Report,
} from "../../src/bff/aggregators/smartHospitalV3ReportAggregator";

describe("assessSmartHospitalTrinity", () => {
  it("90/90/90 → A+", () => {
    expect(assessSmartHospitalTrinity(90, 90, 90).level).toBe("A+");
  });

  it("80/80/80 → A", () => {
    expect(assessSmartHospitalTrinity(80, 80, 80).level).toBe("A");
  });
});

describe("buildSmartHospitalRoadmap", () => {
  it("三级 → 五级 → 3步18个月", () => {
    const r = buildSmartHospitalRoadmap("三级", "五级");
    expect(r.steps).toBe(3);
  });
});

describe("buildSmartHospitalV3Report", () => {
  it("生成智慧医疗数据", () => {
    const r = buildSmartHospitalV3Report("30d");
    expect(r.medical.cdss).toBe(true);
  });

  it("生成智慧服务数据", () => {
    const r = buildSmartHospitalV3Report("30d");
    expect(r.service.appointment).toBeGreaterThan(0);
  });

  it("生成智慧管理数据", () => {
    const r = buildSmartHospitalV3Report("30d");
    expect(r.management.hrp).toBe(true);
  });

  it("生成建议", () => {
    const r = buildSmartHospitalV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
