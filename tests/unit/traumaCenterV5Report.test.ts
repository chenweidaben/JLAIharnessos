/**
 * 健澜科技 jlmedaios - 创伤中心智能化 V5 纯函数单测（M263-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessTraumaTeamReadinessV5,
  buildTraumaCenterV5Report,
  calculateISSV5,
} from "../../src/bff/aggregators/traumaCenterV5ReportAggregator";

describe("calculateISSV5", () => {
  it("胸AIS4+腹AIS4+头AIS3 → ISS 41 重伤 ICU", () => {
    expect(calculateISSV5([{ bodyRegion: "胸", ais: 4 }, { bodyRegion: "腹", ais: 4 }, { bodyRegion: "头", ais: 3 }]).level).toBe("ICU");
  });
});

describe("assessTraumaTeamReadinessV5", () => {
  it("2外科+2护士+1麻醉+创伤箱+有血 → 就绪5分钟", () => {
    expect(assessTraumaTeamReadinessV5({ surgeons: 2, nurses: 2, anesthesia: 1 }, { traumaKit: true, bloodAvailable: true }).ready).toBe(true);
  });
});

describe("buildTraumaCenterV5Report", () => {
  it("生成激活数据", () => {
    const r = buildTraumaCenterV5Report("30d");
    expect(r.activation.multipleTrauma).toBeGreaterThan(0);
  });

  it("生成损伤控制数据", () => {
    const r = buildTraumaCenterV5Report("30d");
    expect(r.damageControl.hemostasis).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildTraumaCenterV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
