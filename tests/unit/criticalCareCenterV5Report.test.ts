/**
 * 健澜科技 jlmedaios - 危重症中心智能化 V5 纯函数单测（M263-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessSepsisBundleV5,
  buildCriticalCareCenterV5Report,
  calculateAPACHEIIV5,
} from "../../src/bff/aggregators/criticalCareCenterV5ReportAggregator";

describe("calculateAPACHEIIV5", () => {
  it("75岁+高热+低血压+心动过速+低钠 → APACHE II 高危综合ICU", () => {
    expect(calculateAPACHEIIV5({ temp: 39.5, map: 45, hr: 150, rr: 55 }, { ph: 7.2, sodium: 115, potassium: 4, creatinine: 2.5 }, 75).level).toBe("综合 ICU");
  });
});

describe("assessSepsisBundleV5", () => {
  it("4项完成 → 达标", () => {
    expect(assessSepsisBundleV5({ lactate: true, bloodCulture: true, antibiotic: true, fluid: true, sourceControl: false }).compliant).toBe(true);
  });
});

describe("buildCriticalCareCenterV5Report", () => {
  it("生成准入数据", () => {
    const r = buildCriticalCareCenterV5Report("30d");
    expect(r.admission.apache).toBeGreaterThan(0);
  });

  it("生成器官支持数据", () => {
    const r = buildCriticalCareCenterV5Report("30d");
    expect(r.organSupport.respiratory).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCriticalCareCenterV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
