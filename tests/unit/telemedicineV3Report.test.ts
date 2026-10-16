/**
 * 健澜科技 jlmedaios - 远程医疗 V3 纯函数单测（M234-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTelemedicineV3Report,
  routeRemoteStudy,
  scheduleRemoteConsultation,
} from "../../src/bff/aggregators/telemedicineV3ReportAggregator";

describe("scheduleRemoteConsultation", () => {
  it("有效病例 → 会诊安排", () => {
    expect(scheduleRemoteConsultation("CASE001", "专家A").scheduled).toBe(true);
  });
});

describe("routeRemoteStudy", () => {
  it("CT检查 → 路由到中心", () => {
    expect(routeRemoteStudy("CT001", "影像中心").routed).toBe(true);
  });
});

describe("buildTelemedicineV3Report", () => {
  it("生成会诊数据", () => {
    const r = buildTelemedicineV3Report("30d");
    expect(r.consult.mdt).toBeGreaterThan(0);
  });

  it("生成影像数据", () => {
    const r = buildTelemedicineV3Report("30d");
    expect(r.imaging.ct).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildTelemedicineV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
