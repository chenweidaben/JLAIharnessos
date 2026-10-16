/**
 * 健澜科技 jlmedaios - 眼科耳鼻喉口腔 V5 纯函数单测（M266-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCataractV5,
  buildENTEyeDentalV5Report,
  screenHearingV5,
} from "../../src/bff/aggregators/entEyeDentalV5ReportAggregator";

describe("assessCataractV5", () => {
  it("视力0.2+晶状体混浊4级 → 成熟期建议手术", () => {
    expect(assessCataractV5({ va: 0.2 }, { opacity: 4 }).surgery).toBe(true);
  });
});

describe("screenHearingV5", () => {
  it("PTA 85+ABR 95 → 重度听力损失人工耳蜗", () => {
    expect(screenHearingV5({ ptA: 85, abr: 95 }).intervention).toBe("人工耳蜗评估");
  });
});

describe("buildENTEyeDentalV5Report", () => {
  it("生成眼科数据", () => {
    const r = buildENTEyeDentalV5Report("30d");
    expect(r.eye.cataract).toBeGreaterThan(0);
  });

  it("生成口腔数据", () => {
    const r = buildENTEyeDentalV5Report("30d");
    expect(r.dental.caries).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildENTEyeDentalV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
