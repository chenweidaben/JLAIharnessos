/**
 * 健澜科技 jlmedaios - 出院用药重整 V13 单测（M314-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compareMedicationListV13,
  detectDuplicateMedsV13,
  detectMissingMedsV13,
  type MedicationV13,
} from "../../src/bff/aggregators/medicationReconciliationV13Aggregator";
import { medicationReconciliationV13Routes } from "../../src/bff/routes/medicationReconciliationV13";

const admissionMeds: MedicationV13[] = [
  { genericName: "aspirin", dosage: "100mg" },
  { genericName: "metformin", dosage: "500mg" },
  { genericName: "lisinopril", dosage: "10mg" },
];

const dischargeMeds: MedicationV13[] = [
  { genericName: "aspirin", dosage: "100mg" },
  { genericName: "metformin", dosage: "500mg" },
  { genericName: "amlodipine", dosage: "5mg" },
];

describe("compareMedicationListV13", () => {
  // 算式：入院 3 药（aspirin/metformin/lisinopril），出院 3 药（aspirin/metformin/amlodipine）
  // 新增 = discharge 有 admission 无 = amlodipine（1）
  // 停用 = admission 有 discharge 无 = lisinopril（1）
  // 继续 = 双方都有 = aspirin/metformin（2）
  it("新增=1, 停用=1, 继续=2", () => {
    const diff = compareMedicationListV13(admissionMeds, dischargeMeds);
    expect(diff.added.length).toBe(1);
    expect(diff.added[0].genericName).toBe("amlodipine");
    expect(diff.stopped.length).toBe(1);
    expect(diff.stopped[0].genericName).toBe("lisinopril");
    expect(diff.continued.length).toBe(2);
  });
  it("空态 → 全 0", () => {
    const diff = compareMedicationListV13([], []);
    expect(diff.added.length).toBe(0);
    expect(diff.stopped.length).toBe(0);
    expect(diff.continued.length).toBe(0);
  });
});

describe("detectMissingMedsV13", () => {
  // 算式：遗漏 = admission 有 discharge 无 = lisinopril（1）
  it("遗漏 = [lisinopril]", () => {
    expect(detectMissingMedsV13(admissionMeds, dischargeMeds).map((m) => m.genericName)).toEqual(["lisinopril"]);
  });
});

describe("detectDuplicateMedsV13", () => {
  // 算式：discharge 3 药通用名各 1 → 无重复
  it("无重复", () => {
    expect(detectDuplicateMedsV13(dischargeMeds).length).toBe(0);
  });
  // 算式：同通用名 2 次 → 重复
  it("同通用名 2 次 → 重复", () => {
    const meds: MedicationV13[] = [
      { genericName: "aspirin", dosage: "100mg" },
      { genericName: "aspirin", dosage: "200mg" },
    ];
    expect(detectDuplicateMedsV13(meds)).toEqual(["aspirin"]);
  });
});

describe("medicationReconciliationV13Routes 读路由", () => {
  it("GET /api/v1/medication-reconciliation 路由存在且 auth:true", () => {
    const route = medicationReconciliationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medication-reconciliation",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
