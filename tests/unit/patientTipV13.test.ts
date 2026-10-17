/**
 * 健澜科技 jlmedaios - 患者侧经验转健康提示 V13 单测（M295-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPatientTipFeedV13,
  filterPatientSafeV13,
  translateToPatientTipV13,
  type PatientExperienceV13,
} from "../../src/bff/aggregators/patientTipV13Aggregator";
import { patientTipV13Routes } from "../../src/bff/routes/patientTipV13";

const experiences: PatientExperienceV13[] = [
  {
    experienceId: "pt-1",
    category: "medication_adherence",
    title: "按时吃抗凝药",
    content: "华法林需固定时间服用",
    tags: ["afib", "elderly"],
  },
  {
    experienceId: "pt-2",
    category: "lifestyle",
    title: "低盐饮食",
    content: "每日盐摄入<5g",
    tags: ["hypertension"],
  },
  {
    experienceId: "pt-3",
    category: "prescription_decision",
    title: "抗生素选择",
    content: "诊断后选头孢类",
    tags: ["infection"],
  },
];

describe("translateToPatientTipV13", () => {
  it("华法林→您正在服用的抗凝药，加免责声明", () => {
    const r = translateToPatientTipV13(experiences[0]);
    expect(r.tipContent).toContain("您正在服用的抗凝药");
    expect(r.disclaimer).toBe("仅供参考，遵医嘱");
  });
});

describe("filterPatientSafeV13", () => {
  it("3条→保留2条（lifestyle+medication_adherence），过滤 prescription_decision", () => {
    const safe = filterPatientSafeV13(experiences);
    expect(safe.length).toBe(2);
    expect(safe.map((e) => e.experienceId).sort()).toEqual(["pt-1", "pt-2"]);
  });
});

describe("buildPatientTipFeedV13", () => {
  it("p-001 标签 [afib,elderly] → 仅命中 pt-1（pt-2 tags=[hypertension] 不命中）", () => {
    const feed = buildPatientTipFeedV13(["afib", "elderly"], experiences);
    expect(feed.length).toBe(1);
    expect(feed[0].experienceId).toBe("pt-1");
  });
  it("空标签→0条", () => {
    expect(buildPatientTipFeedV13([], experiences).length).toBe(0);
  });
});

describe("patientTipV13Routes 读路由", () => {
  it("GET /api/v1/patient-tips 路由存在且 auth:true", () => {
    const route = patientTipV13Routes.find((r) => r.method === "GET" && r.path === "/api/v1/patient-tips");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
