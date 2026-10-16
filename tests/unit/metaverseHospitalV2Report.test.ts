/**
 * 健澜科技 jlmedaios - 元宇宙医院 V2 纯函数单测（M247-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDigitalHumanV2,
  buildMetaverseHospitalV2Report,
  simulateSurgeryVRV2,
} from "../../src/bff/aggregators/metaverseHospitalV2ReportAggregator";

describe("simulateSurgeryVRV2", () => {
  it("复杂度2 → 评分90认证", () => {
    expect(simulateSurgeryVRV2({ name: "腹腔镜胆囊切除", complexity: 2, duration: 60 }).certified).toBe(true);
  });
});

describe("buildDigitalHumanV2", () => {
  it("中文导诊 → 可交互", () => {
    expect(buildDigitalHumanV2({ role: "导诊", language: "zh" }).interactive).toBe(true);
  });
});

describe("buildMetaverseHospitalV2Report", () => {
  it("生成 VR 数据", () => {
    const r = buildMetaverseHospitalV2Report("30d");
    expect(r.vr.surgerySim).toBeGreaterThan(0);
  });

  it("生成 AR 数据", () => {
    const r = buildMetaverseHospitalV2Report("30d");
    expect(r.ar.intraopNav).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMetaverseHospitalV2Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
