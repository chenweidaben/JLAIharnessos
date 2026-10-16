/**
 * 健澜科技 jlmedaios - 元宇宙医院 纯函数单测（M237-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDigitalHuman,
  buildMetaverseHospitalReport,
  simulateSurgeryVR,
} from "../../src/bff/aggregators/metaverseHospitalReportAggregator";

describe("simulateSurgeryVR", () => {
  it("腹腔镜胆囊切除 → 认证", () => {
    expect(simulateSurgeryVR("腹腔镜胆囊切除").certified).toBe(true);
  });
});

describe("buildDigitalHuman", () => {
  it("内科主任角色 → 数字医生", () => {
    expect(buildDigitalHuman("内科主任").name).toContain("内科主任");
  });
});

describe("buildMetaverseHospitalReport", () => {
  it("生成VR数据", () => {
    const r = buildMetaverseHospitalReport("30d");
    expect(r.vr.surgeryTraining).toBeGreaterThan(0);
  });

  it("生成AR数据", () => {
    const r = buildMetaverseHospitalReport("30d");
    expect(r.ar.navigation).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMetaverseHospitalReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
