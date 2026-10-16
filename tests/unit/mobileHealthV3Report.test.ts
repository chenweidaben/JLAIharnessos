/**
 * 健澜科技 jlmedaios - 移动医疗 V3 纯函数单测（M234-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMobileDoctorWorkflow,
  buildMobileHealthV3Report,
  verifyMobileBarcode,
} from "../../src/bff/aggregators/mobileHealthV3ReportAggregator";

describe("buildMobileDoctorWorkflow", () => {
  it("查房上下文 → 4步工作流", () => {
    expect(buildMobileDoctorWorkflow("查房").steps.length).toBe(4);
  });
});

describe("verifyMobileBarcode", () => {
  it("有效条码 → 安全", () => {
    expect(verifyMobileBarcode("P001", "D001").safe).toBe(true);
  });
});

describe("buildMobileHealthV3Report", () => {
  it("生成医生站数据", () => {
    const r = buildMobileHealthV3Report("30d");
    expect(r.stations.doctor).toBeGreaterThan(0);
  });

  it("生成患者App数据", () => {
    const r = buildMobileHealthV3Report("30d");
    expect(r.patientApp.dau).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMobileHealthV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
