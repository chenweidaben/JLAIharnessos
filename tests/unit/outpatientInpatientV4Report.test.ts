/**
 * 健澜科技 jlmedaios - 门诊住院 V4 纯函数单测（M252-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessBedUtilizationV4,
  assessOutpatientEfficiencyV4,
  buildOutpatientInpatientV4Report,
} from "../../src/bff/aggregators/outpatientInpatientV4ReportAggregator";

describe("assessOutpatientEfficiencyV4", () => {
  it("就诊5000时长50000 → 平均10分钟达标", () => {
    expect(assessOutpatientEfficiencyV4(5000, 50000).adequate).toBe(true);
  });
});

describe("assessBedUtilizationV4", () => {
  it("床位1000占用900 → 90%达标", () => {
    expect(assessBedUtilizationV4(1000, 900).adequate).toBe(true);
  });
});

describe("buildOutpatientInpatientV4Report", () => {
  it("生成门诊数据", () => {
    const r = buildOutpatientInpatientV4Report("30d");
    expect(r.outpatient.appointment).toBeGreaterThan(0);
  });

  it("生成床位数据", () => {
    const r = buildOutpatientInpatientV4Report("30d");
    expect(r.bed.utilization).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOutpatientInpatientV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
