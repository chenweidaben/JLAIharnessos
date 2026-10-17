/**
 * 健澜科技 jlmedaios - 经验与临床结局关联 V13 单测（M300-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEffectSizeV13,
  linkExperienceToOutcomeV13,
  rankEvidenceV13,
  type EvidenceExpV13,
  type PatientOutcomeV13,
} from "../../src/bff/aggregators/experienceOutcomeV13Aggregator";
import { experienceOutcomeV13Routes } from "../../src/bff/routes/experienceOutcomeV13";

const outcomes: PatientOutcomeV13[] = [
  { patientId: "p-1", experienceId: "e-1", complicationRate: 5 },
  { patientId: "p-2", experienceId: "e-1", complicationRate: 3 },
  { patientId: "p-3", experienceId: null, complicationRate: 8 },
  { patientId: "p-4", experienceId: null, complicationRate: 6 },
];

const evidence: EvidenceExpV13[] = [
  { experienceId: "e-1", effectSize: -3 },
  { experienceId: "e-2", effectSize: -12 },
  { experienceId: "e-3", effectSize: 1 },
];

describe("linkExperienceToOutcomeV13", () => {
  it("e-1 匹配2个used + 2个control", () => {
    const l = linkExperienceToOutcomeV13("e-1", outcomes);
    expect(l.usedPatients.length).toBe(2);
    expect(l.controlPatients.length).toBe(2);
  });
  it("空态 → 0/0", () => {
    const l = linkExperienceToOutcomeV13("e-x", []);
    expect(l.usedPatients.length).toBe(0);
  });
});

describe("computeEffectSizeV13", () => {
  it("used avg=4 control avg=7 → effect = -3", () => {
    const l = linkExperienceToOutcomeV13("e-1", outcomes);
    expect(computeEffectSizeV13(l.usedPatients, l.controlPatients)).toBe(-3);
  });
});

describe("rankEvidenceV13", () => {
  it("按 |effect| 降序：e-2(12) → e-1(3) → e-3(1)", () => {
    const ranked = rankEvidenceV13(evidence);
    expect(ranked[0].experienceId).toBe("e-2");
    expect(ranked[1].experienceId).toBe("e-1");
    expect(ranked[2].experienceId).toBe("e-3");
  });
  it("强度分级：e-2=strong / e-1=weak / e-3=inconclusive", () => {
    const ranked = rankEvidenceV13(evidence);
    expect(ranked[0].strength).toBe("strong");
    expect(ranked[1].strength).toBe("weak");
    expect(ranked[2].strength).toBe("inconclusive");
  });
});

describe("experienceOutcomeV13Routes 读路由", () => {
  it("GET /api/v1/experience-outcome 路由存在且 auth:true", () => {
    const route = experienceOutcomeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/experience-outcome",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
