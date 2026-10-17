/**
 * 健澜科技 jlmedaios - 院感暴发早期预警 V13 单测（M313-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOutbreakMatrixV13,
  countDeptPathogenV13,
  detectOutbreakV13,
  type InfectionCaseV13,
} from "../../src/bff/aggregators/infectionOutbreakV13Aggregator";
import { infectionOutbreakV13Routes } from "../../src/bff/routes/infectionOutbreakV13";

const cases: InfectionCaseV13[] = [
  { caseId: "i1", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i2", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i3", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i4", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i5", dept: "cardio", pathogen: "MRSA" },
  { caseId: "i6", dept: "surgery", pathogen: "CRE" },
  { caseId: "i7", dept: "surgery", pathogen: "CRE" },
];

describe("countDeptPathogenV13", () => {
  // 算式：cardio×MRSA 5 例；surgery×CRE 2 例 → 2 个单元格
  it("cardio×MRSA=5, surgery×CRE=2", () => {
    const m = countDeptPathogenV13(cases);
    const cardioMrsa = m.find((c) => c.dept === "cardio" && c.pathogen === "MRSA");
    const surgeryCre = m.find((c) => c.dept === "surgery" && c.pathogen === "CRE");
    expect(cardioMrsa?.count).toBe(5);
    expect(surgeryCre?.count).toBe(2);
  });
  it("空态 → []", () => {
    expect(countDeptPathogenV13([]).length).toBe(0);
  });
});

describe("detectOutbreakV13", () => {
  // 算式：threshold=3 → cardio×MRSA=5 ≥ 3 暴发；surgery×CRE=2 < 3 不暴发
  it("threshold=3 → 仅 cardio×MRSA", () => {
    const m = countDeptPathogenV13(cases);
    const ob = detectOutbreakV13(m, 3);
    expect(ob.length).toBe(1);
    expect(ob[0].dept).toBe("cardio");
    expect(ob[0].pathogen).toBe("MRSA");
  });
});

describe("buildOutbreakMatrixV13", () => {
  // 算式：cardio×MRSA isOutbreak=true；surgery×CRE isOutbreak=false
  it("cardio×MRSA 红牌，surgery×CRE 正常", () => {
    const m = countDeptPathogenV13(cases);
    const ob = detectOutbreakV13(m, 3);
    const matrix = buildOutbreakMatrixV13(m, ob);
    const cardioMrsa = matrix.find((c) => c.dept === "cardio");
    const surgeryCre = matrix.find((c) => c.dept === "surgery");
    expect(cardioMrsa?.isOutbreak).toBe(true);
    expect(surgeryCre?.isOutbreak).toBe(false);
  });
});

describe("infectionOutbreakV13Routes 读路由", () => {
  it("GET /api/v1/infection-outbreak 路由存在且 auth:true", () => {
    const route = infectionOutbreakV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infection-outbreak",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
