/**
 * 健澜科技 jlmedaios - 胸痛中心智能化 V5 纯函数单测（M263-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessChestPainRiskV5,
  buildChestPainCenterV5Report,
  trackD2BV5,
} from "../../src/bff/aggregators/chestPainCenterV5ReportAggregator";

describe("assessChestPainRiskV5", () => {
  it("ST抬高 → STEMI 立即启动导管室", () => {
    expect(assessChestPainRiskV5({ radiating: true, sweating: true }, { stElevation: true, stDepression: false }, { elevated: true }).category).toBe("STEMI");
  });
});

describe("trackD2BV5", () => {
  it("到门0分球囊60分 → D2B 60分钟达标", () => {
    expect(trackD2BV5({ id: "p1" }, { door: 0, balloon: 60, cathLab: 30 }).compliant).toBe(true);
  });
});

describe("buildChestPainCenterV5Report", () => {
  it("生成分诊数据", () => {
    const r = buildChestPainCenterV5Report("30d");
    expect(r.triage.firstECG).toBeGreaterThan(0);
  });

  it("生成 STEMI 数据", () => {
    const r = buildChestPainCenterV5Report("30d");
    expect(r.stemi.d2b).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildChestPainCenterV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
