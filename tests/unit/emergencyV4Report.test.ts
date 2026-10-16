/**
 * 健澜科技 jlmedaios - 急诊 V4 纯函数单测（M251-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessGreenChannelV4,
  buildEmergencyV4Report,
  triageEmergencyV4,
} from "../../src/bff/aggregators/emergencyV4ReportAggregator";

describe("triageEmergencyV4", () => {
  it("心跳骤停+SpO2<90 → I级红区", () => {
    expect(triageEmergencyV4("心跳骤停", { bp: 80, hr: 130, spo2: 85 }).level).toBe(1);
  });
});

describe("assessGreenChannelV4", () => {
  it("到门0穿刺60 → 60分钟达标", () => {
    expect(assessGreenChannelV4(0, 60).target).toBe(true);
  });
});

describe("buildEmergencyV4Report", () => {
  it("生成分诊数据", () => {
    const r = buildEmergencyV4Report("30d");
    expect(r.triage.level1).toBeGreaterThan(0);
  });

  it("生成绿色通道数据", () => {
    const r = buildEmergencyV4Report("30d");
    expect(r.greenChannel.chestPain).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEmergencyV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
