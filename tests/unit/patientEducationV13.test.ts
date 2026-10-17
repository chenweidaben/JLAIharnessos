/**
 * 健澜科技 jlmedaios - 健教材料推送 V13 单测（M326-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeForwardRateV13,
  computeReadRateV13,
  countEducationByDiseaseV13,
  type EducationMaterialV13,
} from "../../src/bff/aggregators/patientEducationV13Aggregator";
import { patientEducationV13Routes } from "../../src/bff/routes/patientEducationV13";

const materials: EducationMaterialV13[] = [
  { disease: "高血压", isRead: true, isForwarded: true },
  { disease: "高血压", isRead: true, isForwarded: false },
  { disease: "高血压", isRead: true, isForwarded: false },
  { disease: "高血压", isRead: false, isForwarded: false },
  { disease: "糖尿病", isRead: true, isForwarded: true },
  { disease: "糖尿病", isRead: true, isForwarded: false },
  { disease: "糖尿病", isRead: false, isForwarded: false },
  { disease: "冠心病", isRead: true, isForwarded: false },
  { disease: "冠心病", isRead: true, isForwarded: false },
  { disease: "冠心病", isRead: false, isForwarded: false },
];

describe("countEducationByDiseaseV13", () => {
  // 算式：高血压4 / 糖尿病3 / 冠心病3
  it("病种分组 = 3 类", () => {
    const result = countEducationByDiseaseV13(materials);
    expect(result.length).toBe(3);
    expect(result.find((d) => d.disease === "高血压")?.count).toBe(4);
    expect(result.find((d) => d.disease === "糖尿病")?.count).toBe(3);
    expect(result.find((d) => d.disease === "冠心病")?.count).toBe(3);
  });
  it("空态 → []", () => {
    expect(countEducationByDiseaseV13([]).length).toBe(0);
  });
});

describe("computeReadRateV13", () => {
  // 算式：7/10×100 = 70
  it("阅读率 = 70%", () => {
    expect(computeReadRateV13(materials)).toBe(70);
  });
});

describe("computeForwardRateV13", () => {
  // 算式：2/10×100 = 20
  it("转发率 = 20%", () => {
    expect(computeForwardRateV13(materials)).toBe(20);
  });
});

describe("patientEducationV13Routes 读路由", () => {
  it("GET /api/v1/patient-education-stats 路由存在且 auth:true", () => {
    const route = patientEducationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-education-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
