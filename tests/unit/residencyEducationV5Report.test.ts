/**
 * 健澜科技 jlmedaios - 住培教学考核 OSCE V5 纯函数单测（M269-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildResidencyEducationV5Report,
  scheduleOSCEV5,
  scoreResidentV5,
} from "../../src/bff/aggregators/residencyEducationV5ReportAggregator";

describe("scheduleOSCEV5", () => {
  it("4站×20容量=80+100学员 → 2轮可行", () => {
    expect(scheduleOSCEV5([{ id: "S1", name: "病史", capacity: 20 }, { id: "S2", name: "体检", capacity: 20 }, { id: "S3", name: "操作", capacity: 20 }, { id: "S4", name: "沟通", capacity: 20 }], 100).rounds).toBe(2);
  });
});

describe("scoreResidentV5", () => {
  it("四项均85分 → 平均85分合格", () => {
    expect(scoreResidentV5({ theory: 85, skill: 85, daily: 85, osce: 85 }).pass).toBe(true);
  });
});

describe("buildResidencyEducationV5Report", () => {
  it("生成住培基地数据", () => {
    const r = buildResidencyEducationV5Report("30d");
    expect(r.residencyBase.trainee).toBeGreaterThan(0);
  });

  it("生成OSCE数据", () => {
    const r = buildResidencyEducationV5Report("30d");
    expect(r.osce.stations).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildResidencyEducationV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
