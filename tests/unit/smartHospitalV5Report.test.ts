/**
 * 健澜科技 jlmedaios - 智慧医院三位一体评级 V5 纯函数单测（M267-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessExperienceV5,
  assessSmartHospitalV5,
  buildSmartHospitalV5Report,
} from "../../src/bff/aggregators/smartHospitalV5ReportAggregator";

describe("assessSmartHospitalV5", () => {
  it("三维度平均85分 → A级省级示范", () => {
    const r = assessSmartHospitalV5({ patientSmart: 85, careSmart: 85, managementSmart: 85 });
    expect(r.grade).toBe("A");
  });
});

describe("assessExperienceV5", () => {
  it("患者85+员工80 → 总分83.5保持优势", () => {
    const r = assessExperienceV5({ score: 85, nps: 85 }, { score: 80, nps: 80 });
    expect(r.recommendation).toBe("保持优势");
  });
});

describe("buildSmartHospitalV5Report", () => {
  it("生成三位一体数据", () => {
    const r = buildSmartHospitalV5Report("30d");
    expect(r.triad.patientSmart).toBeGreaterThan(0);
  });

  it("生成患者服务数据", () => {
    const r = buildSmartHospitalV5Report("30d");
    expect(r.patientSmart.internetHospital).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSmartHospitalV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
