/**
 * 健澜科技 jlmedaios - 手术麻醉 V4 纯函数单测（M251-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessSurgerySafetyV4,
  buildSurgeryAnesthesiaV4Report,
  designAnesthesiaPlanV4,
} from "../../src/bff/aggregators/surgeryAnesthesiaV4ReportAggregator";

describe("assessSurgerySafetyV4", () => {
  it("三项全通过 → 100%", () => {
    expect(assessSurgerySafetyV4({ siteMarkup: true, instrumentCount: true, timeout: true }).rate).toBe(100);
  });
});

describe("designAnesthesiaPlanV4", () => {
  it("ASA III → 全麻+有创监测", () => {
    expect(designAnesthesiaPlanV4({ type: "腹腔镜", duration: 2 }, { asa: 3, airway: "正常" }).method).toBe("全麻+有创监测");
  });
});

describe("buildSurgeryAnesthesiaV4Report", () => {
  it("生成排程数据", () => {
    const r = buildSurgeryAnesthesiaV4Report("30d");
    expect(r.schedule.cases).toBeGreaterThan(0);
  });

  it("生成安全数据", () => {
    const r = buildSurgeryAnesthesiaV4Report("30d");
    expect(r.safety.siteMarkup).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSurgeryAnesthesiaV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
