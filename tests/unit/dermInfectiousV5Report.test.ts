/**
 * 健澜科技 jlmedaios - 皮肤与感染性疾病 V5 纯函数单测（M266-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessInfectionSeverityV5,
  buildDermInfectiousV5Report,
  classifyRashV5,
} from "../../src/bff/aggregators/dermInfectiousV5ReportAggregator";

describe("classifyRashV5", () => {
  it("全身水疱+发热3天 → 重症药疹需住院", () => {
    expect(classifyRashV5({ type: "水疱", distribution: "全身" }, { value: 3 }, { present: true }).urgency).toBe("危重");
  });
});

describe("assessInfectionSeverityV5", () => {
  it("BP 85+乳酸3.0+RR 25 → 脓毒症需1h bundle", () => {
    expect(assessInfectionSeverityV5({ temp: 39, bp: 85, hr: 120, rr: 25 }, { wbc: 15, lactate: 3.0 }, { type: "肺炎" }).sepsis).toBe(true);
  });
});

describe("buildDermInfectiousV5Report", () => {
  it("生成皮肤病数据", () => {
    const r = buildDermInfectiousV5Report("30d");
    expect(r.dermatology.acne).toBeGreaterThan(0);
  });

  it("生成感染病数据", () => {
    const r = buildDermInfectiousV5Report("30d");
    expect(r.infectious.bacterial).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDermInfectiousV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
